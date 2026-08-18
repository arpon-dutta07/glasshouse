"""Unit tests for domain classifier and suffix trie matching."""

import pytest
from classifier.trie import SuffixDomainTrie
from classifier.classifier import DomainClassifier


def test_suffix_trie_subdomain_matching():
    trie = SuffixDomainTrie()
    trie.insert("doubleclick.net", category="ad_network", source="oisd")
    trie.insert("google-analytics.com", category="tracker", source="stevenblack")
    trie.insert("wikipedia.org", category="first_party", source="whitelist")

    # Exact match
    match1 = trie.match("doubleclick.net")
    assert match1 is not None
    assert match1[0] == "ad_network"
    assert match1[2] == "doubleclick.net"

    # Deep Subdomain match
    match2 = trie.match("ad.eu.service.doubleclick.net")
    assert match2 is not None
    assert match2[0] == "ad_network"

    match3 = trie.match("region1.analytics.google-analytics.com")
    assert match3 is not None
    assert match3[0] == "tracker"

    # Unmatched
    match4 = trie.match("example.com")
    assert match4 is None

    # Similar suffix but different domain (e.g. notmydoubleclick.net)
    match5 = trie.match("notdoubleclick.net")
    assert match5 is None


def test_custom_allowlist_and_blocklist_overrides():
    classifier = DomainClassifier()
    classifier.load_rules()

    # Normal classification: google-analytics.com is tracker
    c1 = classifier.classify("google-analytics.com")
    assert c1.category == "tracker"
    assert c1.is_blocked is True

    # User adds google-analytics.com to custom allowlist
    classifier.add_custom_allowlist("google-analytics.com")
    c2 = classifier.classify("google-analytics.com")
    assert c2.category == "first_party"
    assert c2.is_blocked is False
    assert c2.source == "custom_allowlist"

    # User adds custom blocklist for an unknown domain
    c3 = classifier.classify("my-custom-iot-leak.internal")
    assert c3.category == "unknown"

    classifier.add_custom_blocklist("my-custom-iot-leak.internal", category="tracker")
    c4 = classifier.classify("my-custom-iot-leak.internal")
    assert c4.category == "tracker"
    assert c4.is_blocked is True
    assert c4.source == "custom_blocklist"


def test_curated_100_domains_accuracy():
    """Validates classification accuracy against a curated fixture of 100 labeled domains."""
    labeled_fixture = [
        # Trackers (35)
        ("google-analytics.com", "tracker"),
        ("analytics.google.com", "tracker"),
        ("region2.google-analytics.com", "tracker"),
        ("hotjar.com", "tracker"),
        ("script.hotjar.com", "tracker"),
        ("mixpanel.com", "tracker"),
        ("api.mixpanel.com", "tracker"),
        ("segment.io", "tracker"),
        ("cdn.segment.io", "tracker"),
        ("amplitude.com", "tracker"),
        ("api.amplitude.com", "tracker"),
        ("sentry.io", "tracker"),
        ("o12345.ingest.sentry.io", "tracker"),
        ("bugsnag.com", "tracker"),
        ("notify.bugsnag.com", "tracker"),
        ("newrelic.com", "tracker"),
        ("bam.nr-data.net", "tracker"),
        ("clarity.ms", "tracker"),
        ("c.clarity.ms", "tracker"),
        ("branch.io", "tracker"),
        ("app.link", "unknown"),
        ("adjust.com", "tracker"),
        ("app.adjust.com", "tracker"),
        ("appsflyer.com", "tracker"),
        ("launches.appsflyer.com", "tracker"),
        ("telemetry.samsung.com", "tracker"),
        ("log-upload.samsungcloudsolution.com", "tracker"),
        ("telemetry.microsoft.com", "tracker"),
        ("v10.events.data.microsoft.com", "tracker"),
        ("watson.telemetry.microsoft.com", "tracker"),
        ("diagnostics.apple.com", "tracker"),
        ("graph.facebook.com", "tracker"),
        ("pixel.facebook.com", "tracker"),
        ("analytics.tiktok.com", "tracker"),
        ("crashlytics.com", "tracker"),

        # Ad Networks (25)
        ("doubleclick.net", "ad_network"),
        ("stats.g.doubleclick.net", "ad_network"),
        ("ad.doubleclick.net", "ad_network"),
        ("googlesyndication.com", "ad_network"),
        ("pagead2.googlesyndication.com", "ad_network"),
        ("googleadservices.com", "ad_network"),
        ("www.googleadservices.com", "ad_network"),
        ("adservice.google.com", "ad_network"),
        ("adnxs.com", "ad_network"),
        ("ib.adnxs.com", "ad_network"),
        ("criteo.com", "ad_network"),
        ("static.criteo.net", "ad_network"),
        ("taboola.com", "ad_network"),
        ("trc.taboola.com", "ad_network"),
        ("outbrain.com", "ad_network"),
        ("widgets.outbrain.com", "ad_network"),
        ("popads.net", "ad_network"),
        ("adcolony.com", "ad_network"),
        ("applovin.com", "ad_network"),
        ("unityads.unity3d.com", "ad_network"),
        ("vungle.com", "ad_network"),
        ("amazon-adsystem.com", "ad_network"),
        ("aax.amazon-adsystem.com", "ad_network"),
        ("admob.com", "ad_network"),
        ("rubiconproject.com", "ad_network"),

        # First Party / Benign (25)
        ("google.com", "first_party"),
        ("www.google.com", "first_party"),
        ("youtube.com", "first_party"),
        ("apple.com", "first_party"),
        ("icloud.com", "first_party"),
        ("microsoft.com", "first_party"),
        ("github.com", "first_party"),
        ("api.github.com", "first_party"),
        ("wikipedia.org", "first_party"),
        ("en.wikipedia.org", "first_party"),
        ("amazon.com", "first_party"),
        ("netflix.com", "first_party"),
        ("spotify.com", "first_party"),
        ("cloudflare.com", "first_party"),
        ("mozilla.org", "first_party"),
        ("python.org", "first_party"),
        ("docs.python.org", "first_party"),
        ("archlinux.org", "first_party"),
        ("ubuntu.com", "first_party"),
        ("debian.org", "first_party"),
        ("duckduckgo.com", "first_party"),
        ("html.duckduckgo.com", "first_party"),
        ("developer.mozilla.org", "first_party"),
        ("support.apple.com", "first_party"),
        ("raw.githubusercontent.com", "unknown"),

        # Unknown / General Web (15)
        ("example.com", "unknown"),
        ("mysmallblog.org", "unknown"),
        ("random-weather-app.io", "unknown"),
        ("local-co-op-bakery.net", "unknown"),
        ("university-portal.edu", "unknown"),
        ("obscure-forum.xyz", "unknown"),
        ("independent-news.info", "unknown"),
        ("recipes-online.me", "unknown"),
        ("tech-community-notes.dev", "unknown"),
        ("game-server-node-4.gg", "unknown"),
        ("art-gallery-showcase.gallery", "unknown"),
        ("local-service-center.biz", "unknown"),
        ("custom-homelab.lab", "unknown"),
        ("personal-portfolio-site.page", "unknown"),
        ("opensource-mirror.cc", "unknown"),
    ]

    classifier = DomainClassifier()
    classifier.load_rules()

    correct = 0
    total = len(labeled_fixture)
    errors = []

    for domain, expected_cat in labeled_fixture:
        res = classifier.classify(domain)
        if res.category == expected_cat:
            correct += 1
        else:
            errors.append((domain, expected_cat, res.category))

    accuracy = (correct / total) * 100.0
    print(f"\nClassification accuracy: {correct}/{total} ({accuracy:.1f}%)")
    assert accuracy >= 95.0, f"Accuracy {accuracy}% was below 95%. Errors: {errors}"
