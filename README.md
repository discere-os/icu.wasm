# @discere-os/icu.wasm

WebAssembly port of ICU - International Components for Unicode providing robust Unicode support and internationalization facilities.

[![CI/CD](https://github.com/discere-os/discere-nucleus/actions/workflows/icu-wasm-ci.yml/badge.svg)](https://github.com/discere-os/discere-nucleus/actions)
[![JSR](https://jsr.io/badges/@discere-os/icu.wasm)](https://jsr.io/@discere-os/icu.wasm)
[![npm version](https://badge.fury.io/js/@discere-os%2Ficu.wasm.svg)](https://badge.fury.io/js/@discere-os%2Ficu.wasm)
[![License](https://img.shields.io/badge/License-Unicode--3.0-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-alpha-orange.svg)](https://github.com/discere-os/discere-nucleus)

#  International Components for Unicode

This is the repository for the [International Components for Unicode](https://icu.unicode.org/).
The ICU project is under the stewardship of [The Unicode Consortium](https://www.unicode.org).

- Source: https://github.com/unicode-org/icu
- Bugs: https://unicode-org.atlassian.net/projects/ICU
- API Docs: https://unicode-org.github.io/icu-docs/
- User Guide: https://unicode-org.github.io/icu/

![ICU Logo](./tools/images/iculogo_64.png)

### Build Status (`main` branch)

Build | Status
------|-------
GitHub Actions (ICU4C) | [![GHA ICU4C](https://github.com/unicode-org/icu/workflows/GHA%20ICU4C/badge.svg)](https://github.com/unicode-org/icu/actions?query=workflow%3A%22GHA+ICU4C%22+branch%3Amain)
GitHub Actions (ICU4J) | [![GHA ICU4J](https://github.com/unicode-org/icu/workflows/GHA%20ICU4J/badge.svg)](https://github.com/unicode-org/icu/actions?query=workflow%3A%22GHA+ICU4J%22+branch%3Amain)
GitHub Actions (Valgrind) | [![GHA CI Valgrind](https://github.com/unicode-org/icu/workflows/GHA%20CI%20Valgrind/badge.svg)](https://github.com/unicode-org/icu/actions/workflows/icu_valgrind.yml?query=workflow%3A%22GHA+CI%22+branch%3Amain)
Exhaustive Tests | [![Exhaustive Tests for ICU](https://github.com/unicode-org/icu/actions/workflows/icu_exhaustive_tests.yml/badge.svg?branch=main)](https://github.com/unicode-org/icu/actions/workflows/icu_exhaustive_tests.yml?query=branch%3Amain)
Fuzzing | [![Fuzzing Status](https://oss-fuzz-build-logs.storage.googleapis.com/badges/icu.svg)](https://bugs.chromium.org/p/oss-fuzz/issues/list?sort=-opened&can=1&q=proj:icu)
OpenSSF Scorecard | [![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/unicode-org/icu/badge)](https://securityscorecards.dev/viewer/?uri=github.com/unicode-org/icu)



### Subdirectories and Information

- [`icu4c/`](./icu4c/) [ICU for C/C++](./icu4c/readme.html)
- [`icu4j/`](./icu4j/) [ICU for Java](./icu4j/readme.html)
- [`tools/`](./tools/) Tools
- [`vendor/`](./vendor/) Vendor dependencies

### Copyright & Licenses

Copyright © 2016 and later: Unicode, Inc. Unicode and the Unicode Logo are registered trademarks of Unicode, Inc. in the United States and other countries.
License & terms of use: https://www.unicode.org/copyright.html

A CLA is required to contribute to this project - please refer to the [CONTRIBUTING.md](./CONTRIBUTING.md) file (or start a Pull Request) for more information.

The contents of this repository are governed by the Unicode [Terms of Use](https://www.unicode.org/copyright.html) and are released under [LICENSE](./LICENSE).

## 💖 Support This Work

This WebAssembly port is part of a larger effort to bring professional desktop applications to browsers with native performance.

**👨‍💻 About the Maintainer**: [Isaac Johnston (@superstructor)](https://github.com/superstructor) - Building foundational browser-native computing infrastructure through systematic C/C++ to WebAssembly porting.

**📊 Impact**: 70+ open source WASM libraries enabling professional applications like Blender, GIMP, and scientific computing tools to run natively in browsers.

**🚀 Your Support Enables**:
- Continued maintenance and updates
- Performance optimizations
- New library ports and integrations
- Documentation and tutorials
- Cross-browser compatibility testing

**[💖 Sponsor this work](https://github.com/sponsors/superstructor)** to help build the future of browser-native computing.
