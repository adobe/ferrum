## [1.9.4](https://github.com/adobe/ferrum/compare/v1.9.3...v1.9.4) (2022-02-03)


### Bug Fixes

* Please create a new release ([89987f4](https://github.com/adobe/ferrum/commit/89987f4a627b1ce32796842c88c5c5bce2e27775))

## [1.9.3](https://github.com/adobe/ferrum/compare/v1.9.2...v1.9.3) (2021-09-20)


### Bug Fixes

* cleanup dependencies ([#206](https://github.com/adobe/ferrum/issues/206)) ([198adf6](https://github.com/adobe/ferrum/commit/198adf6dadecc474a9823bbe1e81aca4c5a96ce7))

## [1.9.2](https://github.com/adobe/ferrum/compare/v1.9.1...v1.9.2) (2021-05-18)


### Bug Fixes

* security updates ([205e075](https://github.com/adobe/ferrum/commit/205e075af6cea668cd203af822de6fc35315111e))

## [1.9.1](https://github.com/adobe/ferrum/compare/v1.9.0...v1.9.1) (2021-05-17)


### Bug Fixes

* take, tryTake now support all containers ([7915b49](https://github.com/adobe/ferrum/commit/7915b4952c620de84f88d370b119a55e868891da)), closes [#193](https://github.com/adobe/ferrum/issues/193)

# [1.9.0](https://github.com/adobe/ferrum/compare/v1.8.0...v1.9.0) (2021-04-16)


### Features

* Hashable Trait & Hash tables ([3a86070](https://github.com/adobe/ferrum/commit/3a86070336d9a7f165e1d1d15b7858a0c1391c89))

# [1.8.0](https://github.com/adobe/ferrum/compare/v1.7.0...v1.8.0) (2021-03-04)


### Features

* Move tests into the documentation examples ([c033897](https://github.com/adobe/ferrum/commit/c033897fc9bc22426c10195dddf0a6b78ffad799)), closes [#87](https://github.com/adobe/ferrum/issues/87) [#62](https://github.com/adobe/ferrum/issues/62)

# [1.7.0](https://github.com/adobe/ferrum/compare/v1.6.0...v1.7.0) (2020-01-17)


### Bug Fixes

* Add missing export for Pairs ([492c02c](https://github.com/adobe/ferrum/commit/492c02c7e1dea16e924ab04bf64d78f1c15e902f))


### Features

* Use ferrum.doctest to make sure examples are valid js code ([b0f9d45](https://github.com/adobe/ferrum/commit/b0f9d4569b4439ffb94c6b3f7a00bf2d6b0ab78a))

# [1.6.0](https://github.com/adobe/ferrum/compare/v1.5.0...v1.6.0) (2020-01-10)


### Features

* mutate(), apply() ([d4e3a7a](https://github.com/adobe/ferrum/commit/d4e3a7a750afe58696097b5f75117c555291d01b))

# [1.5.0](https://github.com/adobe/ferrum/compare/v1.4.1...v1.5.0) (2019-12-23)


### Features

* Alias flatten() -> flat() ([2abad3f](https://github.com/adobe/ferrum/commit/2abad3f4cc72bbad7ee19da8f59d4917504134c6))
* group(), multiline() and takeUntil() ([0bc0ca0](https://github.com/adobe/ferrum/commit/0bc0ca0059b6a7f8f61cf5e66b0ed1adea345a54))

## [1.4.1](https://github.com/adobe/ferrum/compare/v1.4.0...v1.4.1) (2019-10-08)


### Bug Fixes

* **package:** add descritpion ([f56f59a](https://github.com/adobe/ferrum/commit/f56f59a))

# [1.4.0](https://github.com/adobe/ferrum/compare/v1.3.0...v1.4.0) (2019-10-07)


### Features

* Add intersperse() ([a6336a8](https://github.com/adobe/ferrum/commit/a6336a8))

# [1.3.0](https://github.com/adobe/ferrum/compare/v1.2.2...v1.3.0) (2019-08-27)


### Bug Fixes

* Ensure take supports multiple invocations and zero length ([b5612cb](https://github.com/adobe/ferrum/commit/b5612cb))


### Features

* Add function repeatFn() ([81de232](https://github.com/adobe/ferrum/commit/81de232))
* Provide chunkify functions ([9ff9603](https://github.com/adobe/ferrum/commit/9ff9603))
* Provide takeShort() & takeWithFallback() ([bafa834](https://github.com/adobe/ferrum/commit/bafa834))
* slidingWindow now returns an empty sequence if no=0 ([533cff4](https://github.com/adobe/ferrum/commit/533cff4))

## [1.2.2](https://github.com/adobe/ferrum/compare/v1.2.1...v1.2.2) (2019-07-11)


### Bug Fixes

* update all dependencies ([2f3828b](https://github.com/adobe/ferrum/commit/2f3828b))

## [1.2.1](https://github.com/adobe/ferrum/compare/v1.2.0...v1.2.1) (2019-07-11)


### Bug Fixes

* Remove unnecessary dependency ([7274bf2](https://github.com/adobe/ferrum/commit/7274bf2))

# [1.2.0](https://github.com/adobe/ferrum/compare/v1.1.0...v1.2.0) (2019-07-09)


### Features

* Bugfix: Support for objects with sequence ([81ccc8c](https://github.com/adobe/ferrum/commit/81ccc8c))

# [1.1.0](https://github.com/adobe/ferrum/compare/v1.0.0...v1.1.0) (2019-06-25)


### Bug Fixes

* Make sure test & eslint are not run on docs/ ([8cd95d3](https://github.com/adobe/ferrum/commit/8cd95d3))


### Features

* Provide assertSequenceEquals ([7c0b4b8](https://github.com/adobe/ferrum/commit/7c0b4b8))

# 1.0.0 (2019-06-20)


### Bug Fixes

* **docs:** adjust jsdoc comments for better API readability ([82e1f23](https://github.com/adobe/ferrum/commit/82e1f23))


### Features

* Extra functions for extracting values from sequences ([b45a33e](https://github.com/adobe/ferrum/commit/b45a33e))
* new function contains() ([69e45db](https://github.com/adobe/ferrum/commit/69e45db))
* new functions cartesian, ifdef ([bc72a25](https://github.com/adobe/ferrum/commit/bc72a25))
