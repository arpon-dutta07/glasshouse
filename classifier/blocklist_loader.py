"""Blocklist downloader, parser, and caching manager for Layer 1 multi-source merging."""

import os
import re
import json
import logging
from pathlib import Path
from typing import Dict, List, Set, Tuple
import requests

logger = logging.getLogger(__name__)

# Default public blocklist sources merged in Layer 1
DEFAULT_SOURCES = {
    "stevenblack_unified": {
        "url": "https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts",
        "category": "tracker",
    },
    "easyprivacy": {
        "url": "https://v.firebog.net/hosts/Easyprivacy.txt",
        "category": "tracker",
    },
    "easylist_ads": {
        "url": "https://v.firebog.net/hosts/Easylist.txt",
        "category": "ad_network",
    },
    "oisd_basic": {
        "url": "https://big.oisd.nl/domainswg",
        "category": "ad_network",
    },
}

# Curated embedded rules for instant offline initialization & tests
SEED_RULES: Dict[str, List[str]] = {
    "ad_network": [
        # Google Ads ecosystem
        "doubleclick.net",
        "googlesyndication.com",
        "googleadservices.com",
        "adservice.google.com",
        "pagead2.googlesyndication.com",
        "tpc.googlesyndication.com",
        "googleads.g.doubleclick.net",
        "ad.doubleclick.net",
        "static.doubleclick.net",
        "ade.googlesyndication.com",
        "admob.com",
        "googletagmanager.com",
        # Major ad exchanges & SSPs
        "adnxs.com",
        "criteo.com",
        "criteo.net",
        "taboola.com",
        "outbrain.com",
        "popads.net",
        "rubiconproject.com",
        "pubmatic.com",
        "openx.net",
        "smartadserver.com",
        "advertising.com",
        "yieldmo.com",
        "bidswitch.net",
        "casalemedia.com",
        "sharethrough.com",
        "triplelift.com",
        "indexexchange.com",
        "33across.com",
        "sovrn.com",
        "contextweb.com",
        "media.net",
        "revcontent.com",
        "mgid.com",
        "adform.net",
        "adsrvr.org",
        "demdex.net",
        # Mobile ad SDKs
        "adcolony.com",
        "applovin.com",
        "unityads.unity3d.com",
        "vungle.com",
        "amazon-adsystem.com",
        "inmobi.com",
        "ironsrc.com",
        "chartboost.com",
        "adroll.com",
        "mopub.com",
        "startapp.com",
        "fyber.com",
        "tapjoy.com",
        # Social media ads
        "ads.facebook.com",
        "an.facebook.com",
        "ads.pinterest.com",
        "ads.twitter.com",
        "ads.linkedin.com",
        "ads.tiktok.com",
        "ads.reddit.com",
        "ads.snapchat.com",
        "adsapi.snapchat.com",
    ],
    "tracker": [
        # Google Analytics & Measurement
        "google-analytics.com",
        "analytics.google.com",
        "www.googletagmanager.com",
        "ssl.google-analytics.com",
        "tagmanager.google.com",
        "app-measurement.com",
        "firebaselogging-pa.googleapis.com",
        "firebase-settings.crashlytics.com",
        "play.googleapis.com",
        "update.googleapis.com",
        "clientservices.googleapis.com",
        # Web analytics platforms
        "hotjar.com",
        "static.hotjar.com",
        "script.hotjar.com",
        "mixpanel.com",
        "cdn.mxpnl.com",
        "api.mixpanel.com",
        "segment.io",
        "segment.com",
        "cdn.segment.com",
        "api.segment.io",
        "amplitude.com",
        "api.amplitude.com",
        "heap.io",
        "heapanalytics.com",
        "fullstory.com",
        "rs.fullstory.com",
        "clarity.ms",
        "www.clarity.ms",
        "mouseflow.com",
        "luckyorange.com",
        "logrocket.io",
        "logrocket.com",
        "smartlook.com",
        "plausible.io",
        "matomo.cloud",
        # Error tracking & APM
        "sentry.io",
        "browser.sentry-cdn.com",
        "bugsnag.com",
        "notify.bugsnag.com",
        "newrelic.com",
        "nr-data.net",
        "js-agent.newrelic.com",
        "bam.nr-data.net",
        "datadog.com",
        "browser-intake-datadoghq.com",
        "rum-http-intake.logs.datadoghq.com",
        "crashlytics.com",
        "firebase-crashlytics-iid.crashlytics.com",
        "rollbar.com",
        "raygun.com",
        "elastic.co",
        # Attribution & deep linking
        "branch.io",
        "api2.branch.io",
        "bnc.lt",
        "adjust.com",
        "app.adjust.com",
        "appsflyer.com",
        "sdk.appsflyer.com",
        "kochava.com",
        "singular.net",
        "mparticle.com",
        "braze.com",
        "sdk.iad-01.braze.com",
        "flurry.com",
        "data.flurry.com",
        "onesignal.com",
        "intercom.io",
        "widget.intercom.io",
        # Microsoft telemetry
        "telemetry.microsoft.com",
        "events.data.microsoft.com",
        "data.microsoft.com",
        "v10.events.data.microsoft.com",
        "v20.events.data.microsoft.com",
        "watson.telemetry.microsoft.com",
        "settings-win.data.microsoft.com",
        "vortex.data.microsoft.com",
        "vortex-win.data.microsoft.com",
        "umwatsonc.events.data.microsoft.com",
        # Framework & Web telemetry
        "telemetry.nextjs.org",
        "telemetry.mozilla.org",
        "telemetry.elastic.co",
        "telemetry.npmjs.org",
        # Apple telemetry
        "diagnostics.apple.com",
        "iadsdk.apple.com",
        "metrics.icloud.com",
        "xp.apple.com",
        "books-analytics-events.apple.com",
        # Samsung telemetry
        "telemetry.samsung.com",
        "samsungcloudplatform.com",
        "log-upload.samsungcloudsolution.com",
        "analytics.samsung.com",
        # Facebook / Meta tracking
        "graph.facebook.com",
        "pixel.facebook.com",
        "connect.facebook.net",
        "www.facebook.com/tr",
        # TikTok / ByteDance tracking
        "analytics.tiktok.com",
        "log.byteoversea.com",
        "analytics-sg.tiktok.com",
        "mon.byteoversea.com",
        # Score / audience measurement
        "scorecardresearch.com",
        "quantserve.com",
        "mc.yandex.ru",
        "comscore.com",
        "b.scorecardresearch.com",
        "sb.scorecardresearch.com",
        # Marketing & CRM tracking
        "hubspot.com",
        "track.hubspot.com",
        "js.hs-analytics.net",
        "js.hsforms.net",
        "marketo.com",
        "munchkin.marketo.net",
        "pardot.com",
        "drift.com",
        "js.driftt.com",
        "optimizely.com",
        "cdn.optimizely.com",
        "tr.snapchat.com",
        "bat.bing.com",
        "bat.r.msn.com",
        # Fingerprinting & consent
        "cookiebot.com",
        "cdn.cookielaw.org",
        "onetrust.com",
        "consensu.org",
        "trustarc.com",
        "fingerprintjs.com",
        "fpjs.io",
    ],
    "malicious": [
        "malware-delivery.test",
        "phishing-gateway.cc",
        "c2-payload.top",
        "trojan-drop.xyz",
        "lockbit-ransom.onion.pet",
    ],
    "first_party": [
        # Major tech / search
        "google.com",
        "googleapis.com",
        "gstatic.com",
        "googleusercontent.com",
        "googlevideo.com",
        "google.co.in",
        "google.co.uk",
        "google.de",
        "google.fr",
        "google.co.jp",
        "googlezip.net",
        "ggpht.com",
        "gvt1.com",
        "gvt2.com",
        "1e100.net",
        "youtube.com",
        "ytimg.com",
        "youtu.be",
        "youtube-nocookie.com",
        "bing.com",
        "msn.com",
        "live.com",
        "live.net",
        "microsoftonline.com",
        "duckduckgo.com",
        "yahoo.com",
        "yimg.com",
        "baidu.com",
        # Apple / iCloud
        "apple.com",
        "icloud.com",
        "icloud-content.com",
        "apple-dns.net",
        "cdn-apple.com",
        "mzstatic.com",
        "apple-cloudkit.com",
        "itunes.apple.com",
        "apps.apple.com",
        "swcdn.apple.com",
        # Microsoft core services
        "microsoft.com",
        "office.com",
        "office365.com",
        "microsoftedge.com",
        "msedge.net",
        "windows.com",
        "windows.net",
        "windowsupdate.com",
        "skype.com",
        "visualstudio.com",
        "azure.com",
        "azureedge.net",
        "azurewebsites.net",
        "onedrive.com",
        "sharepoint.com",
        "outlook.com",
        "hotmail.com",
        "teams.microsoft.com",
        "onenote.com",
        "aspnetcdn.com",
        "msauth.net",
        "msauthimages.net",
        "msftauth.net",
        # Social media (core services, not tracking pixels)
        "facebook.com",
        "fbcdn.net",
        "fbsbx.com",
        "fb.com",
        "instagram.com",
        "cdninstagram.com",
        "twitter.com",
        "x.com",
        "twimg.com",
        "t.co",
        "linkedin.com",
        "licdn.com",
        "reddit.com",
        "redd.it",
        "redditstatic.com",
        "redditmedia.com",
        "tiktok.com",
        "tiktokcdn.com",
        "snapchat.com",
        "snap.com",
        "sc-cdn.net",
        "pinterest.com",
        "pinimg.com",
        "tumblr.com",
        "discord.com",
        "discord.gg",
        "discordapp.com",
        "discordapp.net",
        "whatsapp.com",
        "whatsapp.net",
        "telegram.org",
        "t.me",
        "telegram.me",
        "signal.org",
        # Amazon / AWS / Streaming
        "amazon.com",
        "amazonaws.com",
        "amazonwebservices.com",
        "amazon.co.uk",
        "amazon.in",
        "amazon.de",
        "ssl-images-amazon.com",
        "media-amazon.com",
        "a2z.com",
        "cloudfront.net",
        "twitch.tv",
        "jtvnw.net",
        "twitchcdn.net",
        "primevideo.com",
        "amzn.to",
        # Netflix & streaming
        "netflix.com",
        "nflxvideo.net",
        "nflximg.net",
        "nflxext.com",
        "nflxso.net",
        "spotify.com",
        "scdn.co",
        "spotifycdn.com",
        "hulu.com",
        "disneyplus.com",
        "disney.com",
        "dssott.com",
        "bamgrid.com",
        "hbo.com",
        "hbomax.com",
        # CDN / Infrastructure
        "cloudflare.com",
        "cloudflare-dns.com",
        "cloudflareinsights.com",
        "cdnjs.cloudflare.com",
        "akamai.com",
        "akamaized.net",
        "akamaihd.net",
        "akamaitechnologies.com",
        "edgekey.net",
        "edgesuite.net",
        "fastly.net",
        "fastlylb.net",
        "jsdelivr.net",
        "unpkg.com",
        "bootstrapcdn.com",
        "maxcdn.com",
        "stackpath.com",
        "lencr.org",
        # Dev tools / open source
        "github.com",
        "github.io",
        "githubusercontent.com",
        "githubassets.com",
        "gitlab.com",
        "npmjs.org",
        "npmjs.com",
        "registry.npmjs.org",
        "yarnpkg.com",
        "pypi.org",
        "pythonhosted.org",
        "python.org",
        "rubygems.org",
        "crates.io",
        "nuget.org",
        "packagist.org",
        "docker.com",
        "docker.io",
        "hub.docker.com",
        "stackoverflow.com",
        "stackexchange.com",
        "vercel.com",
        "vercel.app",
        "netlify.com",
        "netlify.app",
        "heroku.com",
        "herokuapp.com",
        "digitalocean.com",
        "render.com",
        "railway.app",
        "supabase.co",
        "supabase.com",
        "firebase.google.com",
        "firebaseio.com",
        "firebaseapp.com",
        "sentry-cdn.com",
        # Knowledge & productivity
        "wikipedia.org",
        "wikimedia.org",
        "wiktionary.org",
        "medium.com",
        "notion.so",
        "notion.com",
        "trello.com",
        "atlassian.com",
        "atlassian.net",
        "bitbucket.org",
        "jira.com",
        "slack.com",
        "slack-edge.com",
        "slackb.com",
        "zoom.us",
        "zoomcdn.com",
        # AI / LLM platforms
        "openai.com",
        "anthropic.com",
        "claude.ai",
        "gemini.google.com",
        "ai.google.dev",
        "deepmind.com",
        "perplexity.ai",
        "huggingface.co",
        # Adobe
        "adobe.com",
        "adobelogin.com",
        "adobedtm.com",
        "typekit.net",
        "creativecloud.com",
        "behance.net",
        "myportfolio.com",
        # Linux / OS
        "archlinux.org",
        "ubuntu.com",
        "debian.org",
        "fedoraproject.org",
        "kernel.org",
        "linuxmint.com",
        "centos.org",
        "alpinelinux.org",
        "mozilla.org",
        "firefox.com",
        # Payments & fintech
        "paypal.com",
        "stripe.com",
        "js.stripe.com",
        "razorpay.com",
        "braintree-api.com",
        "squareup.com",
        # Email
        "protonmail.com",
        "proton.me",
        "tutanota.com",
        "zoho.com",
        "mailchimp.com",
        "sendgrid.net",
        # Security & VPN
        "letsencrypt.org",
        "digicert.com",
        "globalsign.com",
        "verisign.com",
        "sectigo.com",
        "nordvpn.com",
        "expressvpn.com",
        "mullvad.net",
        "1password.com",
        "bitwarden.com",
        "lastpass.com",
        # E-commerce
        "shopify.com",
        "ebay.com",
        "etsy.com",
        "walmart.com",
        "aliexpress.com",
        "alibaba.com",
        "flipkart.com",
        # Gaming
        "steampowered.com",
        "steamcommunity.com",
        "steamstatic.com",
        "steamcdn-a.akamaihd.net",
        "valve.net",
        "epicgames.com",
        "unrealengine.com",
        "riotgames.com",
        "blizzard.com",
        "battle.net",
        "ea.com",
        "ubisoft.com",
        # Fonts & design
        "fonts.googleapis.com",
        "fonts.gstatic.com",
        "fontawesome.com",
        "use.fontawesome.com",
        "fontsource.org",
        # Misc infra (DNS, NTP, etc)
        "opendns.com",
        "quad9.net",
        "nextdns.io",
        "ntp.org",
        "pool.ntp.org",
        "time.google.com",
        "time.windows.com",
        "ip-api.com",
        "ifconfig.me",
        "ipinfo.io",
        "whatismyip.com",
        "gravatar.com",
        "wp.com",
        "wordpress.com",
        "wordpress.org",
        # News / media
        "bbc.com",
        "bbc.co.uk",
        "cnn.com",
        "nytimes.com",
        "washingtonpost.com",
        "theguardian.com",
        "reuters.com",
        "apnews.com",
        "techcrunch.com",
        "theverge.com",
        "wired.com",
        "arstechnica.com",
        # Indian services
        "jio.com",
        "hotstar.com",
        "zee5.com",
        "sonyliv.com",
        "paytm.com",
        "phonepe.com",
        "gpay.in",
        "myntra.com",
        "swiggy.com",
        "zomato.com",
        # Altruistics / charity
        "altruistics.org",
    ]
}


class BlocklistLoader:
    """Loads, caches, and parses domain blocklists."""

    def __init__(self, cache_dir: str = "data/blocklists"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def parse_domains_text(self, text: str) -> Set[str]:
        """Parses /etc/hosts, EasyList/EasyPrivacy text, or plain domain list formats."""
        domains = set()
        for line in text.splitlines():
            line = line.strip()
            if not line or line.startswith("#") or line.startswith("!"):
                continue
            # Strip inline comments
            line = line.split("#")[0].strip()
            # Strip Adblock Plus filter syntax (e.g. ||domain.com^ or ||domain.com^)
            if line.startswith("||") and "^" in line:
                line = line.replace("||", "").split("^")[0].strip()
            tokens = line.split()
            if len(tokens) >= 2:
                ip, domain = tokens[0], tokens[1]
                if ip in ("0.0.0.0", "127.0.0.1") and domain not in ("localhost", "local", "broadcasthost"):
                    domains.add(domain.lower().rstrip("."))
            elif len(tokens) == 1:
                clean_dom = tokens[0].lower().rstrip(".").lstrip("*.")
                if "." in clean_dom and not clean_dom.startswith("/"):
                    domains.add(clean_dom)
        return domains

    def load_seed_rules(self) -> List[Tuple[str, str, str]]:
        """Returns the built-in curated seed rules (domain, category, source)."""
        rules = []
        for category, domains in SEED_RULES.items():
            for domain in domains:
                rules.append((domain, category, "seed"))
        return rules

    def load_cached_or_download(
        self,
        name: str,
        url: str,
        category: str = "tracker",
        force_refresh: bool = False,
        timeout: int = 8,
    ) -> List[Tuple[str, str, str]]:
        """Loads a blocklist from disk cache or downloads it from remote URL."""
        cache_file = self.cache_dir / f"{name}.txt"
        rules = []

        if cache_file.exists() and not force_refresh:
            logger.info(f"Loading blocklist '{name}' from local cache {cache_file}")
            text = cache_file.read_text(encoding="utf-8", errors="ignore")
            domains = self.parse_domains_text(text)
            for d in domains:
                rules.append((d, category, name))
            return rules

        try:
            logger.info(f"Downloading blocklist '{name}' from {url}")
            resp = requests.get(url, timeout=timeout)
            if resp.status_code == 200:
                cache_file.write_text(resp.text, encoding="utf-8")
                domains = self.parse_domains_text(resp.text)
                for d in domains:
                    rules.append((d, category, name))
                logger.info(f"Loaded {len(domains)} rules from {name}")
                return rules
        except Exception as e:
            logger.warning(f"Failed to download blocklist '{name}': {e}. Falling back to cached/seed rules.")

        if cache_file.exists():
            text = cache_file.read_text(encoding="utf-8", errors="ignore")
            domains = self.parse_domains_text(text)
            for d in domains:
                rules.append((d, category, name))

        return rules
