let inherit (import <nixpkgs> {}) fetchFromGitHub mkShellNoCC cacert git; in

let fetchNixpkgs =
  { rev, sha256 ? "" }: import (fetchFromGitHub { owner = "NixOS"; repo = "nixpkgs"; inherit rev sha256; }) {}; in

let inherit (fetchNixpkgs {
  rev = "5b35d248e9206c1f3baf8de6a7683fee126364aa"; # 24.11 2025/03/11
  sha256 = "NTtKOTLQv6dPfRe00OGSywg37A1FYqldS6xiNmqBUYc=";
}) nodejs_22 pnpm_10; in

mkShellNoCC { packages = [ cacert git nodejs_22 pnpm_10 ]; }
