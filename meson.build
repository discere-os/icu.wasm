project('icu.wasm', ['c', 'cpp'], version: '74.2', meson_version: '>=1.3.0', default_options: ['buildtype=release'])

fs = import('fs')

if get_option('simd')
  add_project_arguments('-msimd128', language: 'c')
  add_project_arguments('-msimd128', language: 'cpp')
endif

# Emscripten-friendly ICU defines (no file I/O, reduced platform assumptions)
add_project_arguments('-DUCONFIG_NO_FILE_IO=1', language: 'c')
add_project_arguments('-DUCONFIG_NO_FILE_IO=1', language: 'cpp')

icu_root = meson.project_source_root() / 'icu4c' / 'source'
incs = [
  include_directories(icu_root / 'common'),
  include_directories(icu_root / 'i18n'),
  include_directories(icu_root / 'io'),
  include_directories(icu_root / 'stubdata'),
]

# Common
common_sources = []
common_sources += fs.glob(icu_root / 'common' / '*.c')
common_sources += fs.glob(icu_root / 'common' / '*.cpp')

# I18n
i18n_sources = []
i18n_sources += fs.glob(icu_root / 'i18n' / '*.c')
i18n_sources += fs.glob(icu_root / 'i18n' / '*.cpp')

# IO (optional but small)
io_sources = []
io_sources += fs.glob(icu_root / 'io' / '*.c')
io_sources += fs.glob(icu_root / 'io' / '*.cpp')

# Stubdata
stub_sources = []
stub_sources += fs.glob(icu_root / 'stubdata' / '*.c')

icu_common = static_library('icu_common', common_sources, include_directories: incs)
icu_i18n = static_library('icu_i18n', i18n_sources, include_directories: incs)
icu_io = static_library('icu_io', io_sources, include_directories: incs)
icu_stub = static_library('icu_stub', stub_sources, include_directories: incs)

link_all = [icu_common, icu_i18n, icu_io, icu_stub]

if get_option('main_module')
  main_link_args = [
    '--no-entry',
    '-sMODULARIZE=1',
    '-sEXPORT_ES6=1',
    '-sALLOW_MEMORY_GROWTH=1',
    '-sENVIRONMENT=web,webview,worker',
    '-sNO_FILESYSTEM=1',
    '-sEXPORTED_RUNTIME_METHODS=["cwrap","ccall","UTF8ToString"]',
    '-sEXPORTED_FUNCTIONS=@' + meson.project_source_root() / get_option('exports'),
  ]
  executable('icu-main', 'src/icu_wasm_module.cpp',
    link_with: link_all,
    include_directories: incs,
    install: true,
    link_args: main_link_args)
endif

if get_option('side_module')
  shared_module('icu-side', 'src/icu_wasm_side.cpp',
    link_whole: link_all,
    include_directories: incs,
    name_prefix: '',
    install: true,
    link_args: ['-sSIDE_MODULE=2', '-fPIC'])
endif

