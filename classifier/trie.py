"""Suffix domain trie for fast O(k) category lookups.

Enables efficient matching of subdomains against root blocked/classified domains,
e.g., 'sub.analytics.doubleclick.net' matches rule 'doubleclick.net'.
"""

from typing import Any, Dict, List, Optional, Tuple


class DomainTrieNode:
    def __init__(self):
        self.children: Dict[str, DomainTrieNode] = {}
        self.is_terminal: bool = False
        self.category: Optional[str] = None
        self.source: Optional[str] = None
        self.matched_pattern: Optional[str] = None


class SuffixDomainTrie:
    """Stores domain rules in reverse-label order for efficient suffix matching."""

    def __init__(self):
        self.root = DomainTrieNode()
        self.count = 0

    def _split_domain(self, domain: str) -> List[str]:
        """Splits domain into normalized lowercase reversed labels."""
        domain = domain.lower().strip().strip(".")
        if not domain:
            return []
        parts = domain.split(".")
        parts.reverse()  # Reverse so 'a.b.com' -> ['com', 'b', 'a']
        return parts

    def insert(self, domain: str, category: str = "tracker", source: str = "blocklist") -> None:
        """Inserts a domain rule into the trie."""
        parts = self._split_domain(domain)
        if not parts:
            return

        curr = self.root
        for part in parts:
            if part not in curr.children:
                curr.children[part] = DomainTrieNode()
            curr = curr.children[part]

        curr.is_terminal = True
        curr.category = category
        curr.source = source
        curr.matched_pattern = domain
        self.count += 1

    def match(self, domain: str) -> Optional[Tuple[str, str, str]]:
        """Matches a domain against the trie.

        Returns (category, source, matched_pattern) if a match or parent-domain match is found,
        or None if no match.
        """
        parts = self._split_domain(domain)
        if not parts:
            return None

        curr = self.root
        best_match = None

        for part in parts:
            if part not in curr.children:
                break
            curr = curr.children[part]
            if curr.is_terminal:
                # Longest suffix match recorded
                best_match = (curr.category, curr.source, curr.matched_pattern)

        return best_match

    def __len__(self) -> int:
        return self.count
