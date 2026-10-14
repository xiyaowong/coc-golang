# Changelog

## [0.8.0](https://github.com/xiyaowong/coc-golang/compare/coc-golang-v0.7.1...coc-golang-v0.8.0) (2026-10-14)


### Features

* highlight code coverage from go.test.coverage ([#55](https://github.com/xiyaowong/coc-golang/issues/55)) ([2cf387c](https://github.com/xiyaowong/coc-golang/commit/2cf387cf58d3b3ef6ea360130b18825611884c47))
* open a coverage profile with go.show.coverprofile ([#63](https://github.com/xiyaowong/coc-golang/issues/63)) ([1ff7db4](https://github.com/xiyaowong/coc-golang/commit/1ff7db436c62f45816d686348d59e0aa673970d6)), closes [#62](https://github.com/xiyaowong/coc-golang/issues/62)
* parse build, vet and lint output as structured data ([#77](https://github.com/xiyaowong/coc-golang/issues/77)) ([18718e6](https://github.com/xiyaowong/coc-golang/commit/18718e60f29c36d647a87f60f39bf40e3a2c4d6d))
* pick a recorded coverage profile in go.apply.coverprofile ([#58](https://github.com/xiyaowong/coc-golang/issues/58)) ([7b76edc](https://github.com/xiyaowong/coc-golang/commit/7b76edc9948206220b827a3419c1698d26ba0d39)), closes [#57](https://github.com/xiyaowong/coc-golang/issues/57)
* pre-fill the impl receiver from the nearest struct ([#91](https://github.com/xiyaowong/coc-golang/issues/91)) ([0c03d87](https://github.com/xiyaowong/coc-golang/commit/0c03d87a126649497c3f0f0ceb93c9dfa1587e9f))
* show coverage counts by default ([#83](https://github.com/xiyaowong/coc-golang/issues/83)) ([bba0264](https://github.com/xiyaowong/coc-golang/commit/bba0264768e8596b922c10e7e1090c8cf2f96d8b))
* show coverage execution counts as virtual text ([#75](https://github.com/xiyaowong/coc-golang/issues/75)) ([1e16876](https://github.com/xiyaowong/coc-golang/commit/1e168763fc8ad2dd1d9e80749b4d8ce48735fa12)), closes [#68](https://github.com/xiyaowong/coc-golang/issues/68)
* show long-running command state in the status bar ([#85](https://github.com/xiyaowong/coc-golang/issues/85)) ([cf34363](https://github.com/xiyaowong/coc-golang/commit/cf34363ccb3f5ec50fdf2c632332b22ff8a7b74e))
* show the changelog with go.showChangeLog ([#64](https://github.com/xiyaowong/coc-golang/issues/64)) ([89139f7](https://github.com/xiyaowong/coc-golang/commit/89139f7576695fc0fbf262ebb98cbaddb999837d)), closes [#61](https://github.com/xiyaowong/coc-golang/issues/61)
* suppress diagnostics the language server already reports ([#78](https://github.com/xiyaowong/coc-golang/issues/78)) ([3a5d4de](https://github.com/xiyaowong/coc-golang/commit/3a5d4de837d39b285f287b6d853c9fdc9ffe0973))


### Bug Fixes

* pass the impl receiver as one argument and insert its stubs ([#88](https://github.com/xiyaowong/coc-golang/issues/88)) ([61a5ad1](https://github.com/xiyaowong/coc-golang/commit/61a5ad121c34b15fc49c8405d0385d41174b488d))
* widen build and vet diagnostics to cover the reported line ([#76](https://github.com/xiyaowong/coc-golang/issues/76)) ([0f1aae7](https://github.com/xiyaowong/coc-golang/commit/0f1aae75fceb076459eb595b2bdfa154ffbb9f53))


### Performance Improvements

* activate from the workspace instead of every command ([#70](https://github.com/xiyaowong/coc-golang/issues/70)) ([80b05c1](https://github.com/xiyaowong/coc-golang/commit/80b05c109c859cd82cd341d8a8cc6167a59d96cc)), closes [#65](https://github.com/xiyaowong/coc-golang/issues/65)

## [0.7.1](https://github.com/xiyaowong/coc-golang/compare/coc-golang-v0.7.0...coc-golang-v0.7.1) (2026-10-10)


### Bug Fixes

* **docs:** stop the changelog page from failing hydration ([#47](https://github.com/xiyaowong/coc-golang/issues/47)) ([bef3054](https://github.com/xiyaowong/coc-golang/commit/bef3054438351b58a651f4a094a21fabc57eabde))

## [0.7.0](https://github.com/xiyaowong/coc-golang/compare/coc-golang-v0.6.0...coc-golang-v0.7.0) (2026-10-10)


### Features

* add a Go test explorer tree view ([#44](https://github.com/xiyaowong/coc-golang/issues/44)) ([9f46fc9](https://github.com/xiyaowong/coc-golang/commit/9f46fc9fd01e999293040e216cfeb8b1eca5dda4))
* add go.convert.jsonToGo command ([#40](https://github.com/xiyaowong/coc-golang/issues/40)) ([409b2a1](https://github.com/xiyaowong/coc-golang/commit/409b2a1bb9bce10fa4065f7f8ea0fb681c896073))

## [0.6.0](https://github.com/xiyaowong/coc-golang/compare/coc-golang-v0.5.0...coc-golang-v0.6.0) (2026-10-09)


### Features

* **docs:** add a changelog page to the documentation site ([#39](https://github.com/xiyaowong/coc-golang/issues/39)) ([fe9d733](https://github.com/xiyaowong/coc-golang/commit/fe9d733612b14eea62c11763f0a3c1fa51c81472))


### Bug Fixes

* pass go-jsonschema an absolute path it can resolve on Windows ([#37](https://github.com/xiyaowong/coc-golang/issues/37)) ([d274b69](https://github.com/xiyaowong/coc-golang/commit/d274b699eed4dcf5fff43c7bd7c2d7ad610c5466))

## [0.5.0](https://github.com/xiyaowong/coc-golang/compare/coc-golang-v0.4.0...coc-golang-v0.5.0) (2026-10-09)


### Features

* add go.convert.jsonSchema and surface command failures ([#36](https://github.com/xiyaowong/coc-golang/issues/36)) ([15137a4](https://github.com/xiyaowong/coc-golang/commit/15137a483eab28e5adec4154bc40f492afdccd71))
* **docs:** add a documentation website ([#35](https://github.com/xiyaowong/coc-golang/issues/35)) ([200f0fa](https://github.com/xiyaowong/coc-golang/commit/200f0fad67b25dfa943b3846b861472ab3fa24fb))
* show verbose go command results as notifications ([5f9cd1a](https://github.com/xiyaowong/coc-golang/commit/5f9cd1ab2518f5b32296af16d360235317163d46))


### Bug Fixes

* guard coc.nvim host APIs in command inputs and settings writes ([#34](https://github.com/xiyaowong/coc-golang/issues/34)) ([598c376](https://github.com/xiyaowong/coc-golang/commit/598c376779607eebc3cf9cab41ebddf1fc449ec6))
* keep gopls overlays in sync for every command ([5b0988f](https://github.com/xiyaowong/coc-golang/commit/5b0988fbcc24290a81807d80123f38531f82108f))

## [0.4.0](https://github.com/xiyaowong/coc-golang/compare/coc-golang-v0.3.0...coc-golang-v0.4.0) (2026-10-09)


### Features

* show the gopls status in the status bar ([655884b](https://github.com/xiyaowong/coc-golang/commit/655884bdbfe417aabe4e7ea3fbcda910d263aa3c))

## [0.3.0](https://github.com/xiyaowong/coc-golang/compare/coc-golang-v0.2.0...coc-golang-v0.3.0) (2026-10-08)


### Features

* add go mod and go work commands ([9684c59](https://github.com/xiyaowong/coc-golang/commit/9684c5992ace1e49a6f3dcecb99ae94175b01796))
* add go.tags commands for struct tags ([73d1810](https://github.com/xiyaowong/coc-golang/commit/73d1810eafd11ab28fc55c83633cf71142dbdb89))
* add gopls settings to the configuration schema ([3e2c055](https://github.com/xiyaowong/coc-golang/commit/3e2c0556cda68564462fc1f5bdccf835ed1b0662))


### Bug Fixes

* read unsaved state from the buffer modified option ([8af8982](https://github.com/xiyaowong/coc-golang/commit/8af89829bc204810e7aa70cf0cfd7717e1c44cad))

## [0.2.0](https://github.com/xiyaowong/coc-golang/compare/coc-golang-v0.1.0...coc-golang-v0.2.0) (2026-10-08)


### Features

* improve Go commands and extension testing ([7f441ca](https://github.com/xiyaowong/coc-golang/commit/7f441cadb77487b6c876edb94f31c849924ca455))
