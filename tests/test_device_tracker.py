"""Unit tests for device identification, ARP parsing, and MAC OUI vendor resolution."""

import pytest
from backend.device_tracker import DeviceTracker, normalize_mac


def test_normalize_mac():
    assert normalize_mac("00-11-22-33-44-55") == "00:11:22:33:44:55"
    assert normalize_mac("A483E7112233") == "a4:83:e7:11:22:33"
    assert normalize_mac("50:85:69:AA:BB:CC") == "50:85:69:aa:bb:cc"


def test_vendor_lookup_known_manufacturers():
    tracker = DeviceTracker()

    # Apple
    assert "Apple" in tracker.lookup_vendor("a4:83:e7:00:11:22")
    # Samsung
    assert "Samsung Electronics" in tracker.lookup_vendor("50:85:69:12:34:56")
    # Espressif IoT
    assert "Espressif" in tracker.lookup_vendor("24:0a:c4:99:88:77")
    # Raspberry Pi
    assert "Raspberry Pi" in tracker.lookup_vendor("b8:27:eb:aa:bb:cc")
    # Google
    assert "Google" in tracker.lookup_vendor("3c:5a:b4:11:22:33")


def test_suggest_device_name():
    tracker = DeviceTracker()
    name = tracker.suggest_device_name("50:85:69:12:34:56", vendor="Samsung Electronics")
    assert "Samsung" in name
    assert "34:56" in name


def test_parse_arp_output():
    tracker = DeviceTracker()
    windows_arp_sample = """
Interface: 192.168.1.50 --- 0x10
  Internet Address      Physical Address      Type
  192.168.1.1           00-11-22-33-44-55     dynamic
  192.168.1.100         50-85-69-12-34-56     dynamic
  192.168.1.255         ff-ff-ff-ff-ff-ff     static
"""
    mapping = tracker.parse_arp_output(windows_arp_sample)
    assert mapping.get("192.168.1.1") == "00:11:22:33:44:55"
    assert mapping.get("192.168.1.100") == "50:85:69:12:34:56"
    assert "192.168.1.255" not in mapping  # Broadcast excluded


def test_parse_proc_net_arp():
    tracker = DeviceTracker()
    linux_proc_arp = """IP address       HW type     Flags       HW address            Mask     Device
192.168.1.1      0x1         0x2         00:11:22:33:44:55     *        eth0
192.168.1.102    0x1         0x2         a4:83:e7:99:88:77     *        wlan0
192.168.1.105    0x1         0x0         00:00:00:00:00:00     *        eth0
"""
    mapping = tracker.parse_proc_net_arp(linux_proc_arp)
    assert mapping.get("192.168.1.1") == "00:11:22:33:44:55"
    assert mapping.get("192.168.1.102") == "a4:83:e7:99:88:77"
    assert "192.168.1.105" not in mapping  # Incomplete ARP entry excluded
