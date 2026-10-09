---
title: Analyzer reference
description: The analyzers bundled with gopls.
---

<!-- Generated from package.json (and src/tools.ts). Do not edit by hand. -->
gopls bundles the analyzer suite below. Enable or disable one by setting it under `gopls.analyses`, for example `{"gopls": {"analyses": {"unusedwrite": false}}}`. There are 248 analyzers.

| Analyzer | Default | Summary |
| --- | --- | --- |
| `QF1001` | `false` | Apply De Morgan's law |
| `QF1002` | `true` | Convert untagged switch to tagged switch |
| `QF1003` | `true` | Convert if/else-if chain to tagged switch |
| `QF1004` | `true` | Use strings.ReplaceAll instead of strings.Replace with n == -1 |
| `QF1005` | `false` | Expand call to math.Pow |
| `QF1006` | `false` | Lift if+break into loop condition |
| `QF1007` | `false` | Merge conditional assignment into variable declaration |
| `QF1008` | `false` | Omit embedded fields from selector expression |
| `QF1009` | `true` | Use time.Time.Equal instead of == operator |
| `QF1010` | `true` | Convert slice of bytes to string when printing it |
| `QF1011` | `false` | Omit redundant type from variable declaration |
| `QF1012` | `true` | Use fmt.Fprintf(x, ...) instead of x.Write(fmt.Sprintf(...)) |
| `S1000` | `true` | Use plain channel send or receive instead of single-case select |
| `S1001` | `true` | Replace for loop with call to copy |
| `S1002` | `false` | Omit comparison with boolean constant |
| `S1003` | `true` | Replace call to strings.Index with strings.Contains |
| `S1004` | `true` | Replace call to bytes.Compare with bytes.Equal |
| `S1005` | `false` | Drop unnecessary use of the blank identifier |
| `S1006` | `false` | Use 'for &#123; ... &#125;' for infinite loops |
| `S1007` | `true` | Simplify regular expression by using raw string literal |
| `S1008` | `false` | Simplify returning boolean expression |
| `S1009` | `true` | Omit redundant nil check on slices, maps, and channels |
| `S1010` | `true` | Omit default slice index |
| `S1011` | `false` | Use a single append to concatenate two slices |
| `S1012` | `true` | Replace time.Now().Sub(x) with time.Since(x) |
| `S1016` | `false` | Use a type conversion instead of manually copying struct fields |
| `S1017` | `true` | Replace manual trimming with strings.TrimPrefix |
| `S1018` | `true` | Use 'copy' for sliding elements |
| `S1019` | `true` | Simplify 'make' call by omitting redundant arguments |
| `S1020` | `true` | Omit redundant nil check in type assertion |
| `S1021` | `false` | Merge variable declaration and assignment |
| `S1023` | `true` | Omit redundant control flow |
| `S1024` | `true` | Replace x.Sub(time.Now()) with time.Until(x) |
| `S1025` | `false` | Don't use fmt.Sprintf("%s", x) unnecessarily |
| `S1028` | `true` | Simplify error construction with fmt.Errorf |
| `S1029` | `false` | Range over the string directly |
| `S1030` | `true` | Use bytes.Buffer.String or bytes.Buffer.Bytes |
| `S1031` | `true` | Omit redundant nil check around loop |
| `S1032` | `true` | Use sort.Ints(x), sort.Float64s(x), and sort.Strings(x) |
| `S1033` | `true` | Unnecessary guard around call to 'delete' |
| `S1034` | `true` | Use result of type assertion to simplify cases |
| `S1035` | `true` | Redundant call to net/http.CanonicalHeaderKey in method call on net/http.Header |
| `S1036` | `true` | Unnecessary guard around map access |
| `S1037` | `true` | Elaborate way of sleeping |
| `S1038` | `true` | Unnecessarily complex way of printing formatted string |
| `S1039` | `true` | Unnecessary use of fmt.Sprint |
| `S1040` | `true` | Type assertion to current type |
| `SA1000` | `false` | Invalid regular expression |
| `SA1001` | `true` | Invalid template |
| `SA1002` | `false` | Invalid format in time.Parse |
| `SA1003` | `false` | Unsupported argument to functions in encoding/binary |
| `SA1004` | `true` | Suspiciously small untyped constant in time.Sleep |
| `SA1005` | `true` | Invalid first argument to exec.Command |
| `SA1007` | `false` | Invalid URL in net/url.Parse |
| `SA1008` | `true` | Non-canonical key in http.Header map |
| `SA1010` | `false` | (*regexp.Regexp).FindAll called with n == 0, which will always return zero results |
| `SA1011` | `false` | Various methods in the 'strings' package expect valid UTF-8, but invalid input is provided |
| `SA1012` | `true` | A nil context.Context is being passed to a function, consider using context.TODO instead |
| `SA1013` | `true` | io.Seeker.Seek is being called with the whence constant as the first argument, but it should be the second |
| `SA1014` | `false` | Non-pointer value passed to Unmarshal or Decode |
| `SA1015` | `false` | Using time.Tick in a way that will leak. Consider using time.NewTicker, and only use time.Tick in tests, commands and e… |
| `SA1016` | `true` | Trapping a signal that cannot be trapped |
| `SA1017` | `false` | Channels used with os/signal.Notify should be buffered |
| `SA1018` | `false` | strings.Replace called with n == 0, which does nothing |
| `SA1020` | `false` | Using an invalid host:port pair with a net.Listen-related function |
| `SA1021` | `false` | Using bytes.Equal to compare two net.IP |
| `SA1023` | `false` | Modifying the buffer in an io.Writer implementation |
| `SA1024` | `false` | A string cutset contains duplicate characters |
| `SA1025` | `false` | It is not possible to use (*time.Timer).Reset's return value correctly |
| `SA1026` | `false` | Cannot marshal channels or functions |
| `SA1027` | `false` | Atomic access to 64-bit variable must be 64-bit aligned |
| `SA1028` | `false` | sort.Slice can only be used on slices |
| `SA1029` | `false` | Inappropriate key in call to context.WithValue |
| `SA1030` | `false` | Invalid argument in call to a strconv function |
| `SA1031` | `false` | Overlapping byte slices passed to an encoder |
| `SA1032` | `false` | Wrong order of arguments to errors.Is |
| `SA2001` | `true` | Empty critical section, did you mean to defer the unlock? |
| `SA2002` | `false` | Called testing.T.FailNow or SkipNow in a goroutine, which isn't allowed |
| `SA2003` | `false` | Deferred Lock right after locking, likely meant to defer Unlock instead |
| `SA3000` | `true` | TestMain doesn't call os.Exit, hiding test failures |
| `SA3001` | `true` | Assigning to b.N in benchmarks distorts the results |
| `SA4000` | `true` | Binary operator has identical expressions on both sides |
| `SA4001` | `true` | &*x gets simplified to x, it does not copy x |
| `SA4003` | `true` | Comparing unsigned values against negative values is pointless |
| `SA4004` | `true` | The loop exits unconditionally after one iteration |
| `SA4005` | `false` | Field assignment that will never be observed. Did you mean to use a pointer receiver? |
| `SA4006` | `false` | A value assigned to a variable is never read before being overwritten. Forgotten error check or dead code? |
| `SA4008` | `false` | The variable in the loop condition never changes, are you incrementing the wrong variable? |
| `SA4009` | `false` | A function argument is overwritten before its first use |
| `SA4010` | `false` | The result of append will never be observed anywhere |
| `SA4011` | `true` | Break statement with no effect. Did you mean to break out of an outer loop? |
| `SA4012` | `false` | Comparing a value against NaN even though no value is equal to NaN |
| `SA4013` | `true` | Negating a boolean twice (!!b) is the same as writing b. This is either redundant, or a typo. |
| `SA4014` | `true` | An if/else if chain has repeated conditions and no side-effects; if the condition didn't match the first time, it won't… |
| `SA4015` | `false` | Calling functions like math.Ceil on floats converted from integers doesn't do anything useful |
| `SA4016` | `true` | Certain bitwise operations, such as x ^ 0, do not do anything useful |
| `SA4017` | `false` | Discarding the return values of a function without side effects, making the call pointless |
| `SA4018` | `false` | Self-assignment of variables |
| `SA4019` | `true` | Multiple, identical build constraints in the same file |
| `SA4020` | `true` | Unreachable case clause in a type switch |
| `SA4022` | `true` | Comparing the address of a variable against nil |
| `SA4023` | `false` | Impossible comparison of interface value with untyped nil |
| `SA4024` | `true` | Checking for impossible return value from a builtin function |
| `SA4025` | `true` | Integer division of literals that results in zero |
| `SA4026` | `true` | Go constants cannot express negative zero |
| `SA4027` | `true` | (*net/url.URL).Query returns a copy, modifying it doesn't change the URL |
| `SA4028` | `true` | x % 1 is always zero |
| `SA4029` | `true` | Ineffective attempt at sorting slice |
| `SA4030` | `true` | Ineffective attempt at generating random number |
| `SA4031` | `false` | Checking never-nil value against nil |
| `SA4032` | `true` | Comparing runtime.GOOS or runtime.GOARCH against impossible value |
| `SA5000` | `false` | Assignment to nil map |
| `SA5001` | `true` | Deferring Close before checking for a possible error |
| `SA5002` | `false` | The empty for loop ('for &#123;&#125;') spins and can block the scheduler |
| `SA5003` | `true` | Defers in infinite loops will never execute |
| `SA5004` | `true` | 'for &#123; select &#123; ...' with an empty default branch spins |
| `SA5005` | `false` | The finalizer references the finalized object, preventing garbage collection |
| `SA5007` | `false` | Infinite recursive call |
| `SA5008` | `true` | Invalid struct tag |
| `SA5010` | `false` | Impossible type assertion |
| `SA5012` | `false` | Passing odd-sized slice to function expecting even size |
| `SA6000` | `false` | Using regexp.Match or related in a loop, should use regexp.Compile |
| `SA6001` | `false` | Missing an optimization opportunity when indexing maps by byte slices |
| `SA6002` | `false` | Storing non-pointer values in sync.Pool allocates memory |
| `SA6003` | `false` | Converting a string to a slice of runes before ranging over it |
| `SA6005` | `true` | Inefficient string comparison with strings.ToLower or strings.ToUpper |
| `SA6006` | `true` | Using io.WriteString to write []byte |
| `SA9001` | `false` | Defers in range loops may not run when you expect them to |
| `SA9002` | `true` | Using a non-octal os.FileMode that looks like it was meant to be in octal. |
| `SA9003` | `false` | Empty body in an if or else branch |
| `SA9004` | `true` | Only the first constant has an explicit type |
| `SA9005` | `false` | Trying to marshal a struct with no public fields nor custom marshaling |
| `SA9006` | `true` | Dubious bit shifting of a fixed size integer value |
| `SA9007` | `false` | Deleting a directory that shouldn't be deleted |
| `SA9008` | `false` | else branch of a type assertion is probably not reading the right value |
| `SA9009` | `true` | Ineffectual Go compiler directive |
| `SA9010` | `true` | Returned function should be called in defer |
| `ST1000` | `false` | Incorrect or missing package comment |
| `ST1001` | `false` | Dot imports are discouraged |
| `ST1003` | `false` | Poorly chosen identifier |
| `ST1005` | `false` | Incorrectly formatted error string |
| `ST1006` | `false` | Poorly chosen receiver name |
| `ST1008` | `false` | A function's error value should be its last return value |
| `ST1011` | `false` | Poorly chosen name for variable of type time.Duration |
| `ST1012` | `false` | Poorly chosen name for error variable |
| `ST1013` | `false` | Should use constants for HTTP error codes, not magic numbers |
| `ST1015` | `false` | A switch's default case should be the first or last case |
| `ST1016` | `false` | Use consistent method receiver names |
| `ST1017` | `false` | Don't use Yoda conditions |
| `ST1018` | `false` | Avoid zero-width and control characters in string literals |
| `ST1019` | `false` | Importing the same package multiple times |
| `ST1020` | `false` | The documentation of an exported function should start with the function's name |
| `ST1021` | `false` | The documentation of an exported type should start with type's name |
| `ST1022` | `false` | The documentation of an exported variable or constant should start with variable's name |
| `ST1023` | `false` | Redundant type in variable declaration |
| `any` | `true` | replace interface&#123;&#125; with any |
| `appendclipped` | `false` | simplify append chains using slices.Concat |
| `appends` | `true` | check for missing values after append |
| `asmdecl` | `true` | report mismatches between assembly files and Go declarations |
| `assign` | `true` | check for useless assignments |
| `atomic` | `true` | check for common mistakes using the sync/atomic package |
| `atomicalign` | `true` | check for non-64-bits-aligned arguments to sync/atomic functions |
| `atomictypes` | `true` | replace basic types in sync/atomic calls with atomic types |
| `bloop` | `true` | replace for-range over b.N with b.Loop |
| `bools` | `true` | check for common mistakes involving boolean operators |
| `buildtag` | `true` | check //go:build and // +build directives |
| `cgocall` | `true` | detect some violations of the cgo pointer passing rules |
| `composites` | `true` | check for unkeyed composite literals |
| `copylocks` | `true` | check for locks erroneously passed by value |
| `deepequalerrors` | `true` | check for calls of reflect.DeepEqual on error values |
| `defers` | `true` | report common mistakes in defer statements |
| `deprecated` | `true` | check for use of deprecated identifiers |
| `directive` | `true` | check Go toolchain directives such as //go:debug |
| `embed` | `true` | check //go:embed directive usage |
| `embedlit` | `true` | simplify references to embedded fields in composite literals |
| `errorsas` | `true` | report passing non-pointer or non-error values to errors.As |
| `errorsastype` | `true` | replace errors.As with errors.AsType[T] |
| `errorsastypeshadow` | `true` | report shadowing of errors.AsType[T] in if/else chains |
| `fieldalignment` | `false` | find structs that would use less memory if their fields were sorted |
| `fillreturns` | `true` | suggest fixes for errors due to an incorrect number of return values |
| `fmtappendf` | `true` | replace []byte(fmt.Sprintf) with fmt.Appendf |
| `forvar` | `true` | remove redundant re-declaration of loop variables |
| `framepointer` | `true` | report assembly that clobbers the frame pointer before saving it |
| `hostport` | `true` | check format of addresses passed to net.Dial |
| `httpresponse` | `true` | check for mistakes using HTTP responses |
| `ifaceassert` | `true` | detect impossible interface-to-interface type assertions |
| `importcomment` | `true` | remove obsolete comments specifying canonical import path |
| `infertypeargs` | `true` | check for unnecessary type arguments in call expressions |
| `inline` | `true` | apply fixes based on 'go:fix inline' comment directives |
| `loopclosure` | `true` | check references to loop variables from within nested functions |
| `lostcancel` | `true` | check cancel func returned by context.WithCancel is called |
| `maprange` | `true` | checks for unnecessary calls to maps.Keys and maps.Values in range statements |
| `mapsloop` | `true` | replace explicit loops over maps with calls to maps package |
| `minmax` | `true` | replace if/else statements with calls to min or max |
| `newexpr` | `true` | simplify code by using go1.26's new(expr) |
| `nilfunc` | `true` | check for useless comparisons between functions and nil |
| `nilness` | `true` | check for redundant or impossible nil comparisons |
| `nonewvars` | `true` | suggested fixes for "no new vars on left side of :=" |
| `noresultvalues` | `true` | suggested fixes for unexpected return values |
| `omitzero` | `true` | suggest replacing omitempty with omitzero for struct fields |
| `plusbuild` | `true` | remove obsolete //+build comments |
| `printf` | `true` | check consistency of Printf format strings and arguments |
| `ptrtoerror` | `true` | detect inconsistent conversions of concrete types to error |
| `rangeint` | `true` | replace 3-clause for loops with for-range over integers |
| `recursiveiter` | `true` | check for inefficient recursive iterators |
| `reflecttypeassert` | `true` | replace v.Interface().(T) with reflect.TypeAssert[T](v) |
| `reflecttypefor` | `true` | replace reflect.TypeOf(x) with TypeFor[T]() |
| `scannererr` | `true` | scannererr: report failure to check bufio.Scanner.Err |
| `shadow` | `false` | check for possible unintended shadowing of variables |
| `shift` | `true` | check for shifts that equal or exceed the width of the integer |
| `sigchanyzer` | `true` | check for unbuffered channel of os.Signal |
| `simplifycompositelit` | `true` | check for composite literal simplifications |
| `simplifyrange` | `true` | check for range statement simplifications |
| `simplifyslice` | `true` | check for slice simplifications |
| `slicesbackward` | `true` | replace backward loops over slices with slices.Backward |
| `slicesclip` | `true` | replace three-index slice expressions with slices.Clip |
| `slicescontains` | `true` | replace loops with slices.Contains or slices.ContainsFunc |
| `slicesdelete` | `false` | replace append-based slice deletion with slices.Delete |
| `slicessort` | `true` | replace sort.Slice with slices.Sort for basic types |
| `slog` | `true` | check for invalid structured logging calls |
| `sortslice` | `true` | check the argument type of sort.Slice |
| `sqlrowserr` | `true` | sqlrowserr: report failure to check sql.Rows.Err |
| `stditerators` | `true` | use iterators instead of Len/At-style APIs |
| `stdmethods` | `true` | check signature of methods of well-known interfaces |
| `stdversion` | `true` | report uses of too-new standard library symbols |
| `stringintconv` | `true` | check for string(int) conversions |
| `stringsbuilder` | `true` | replace += with strings.Builder |
| `stringscut` | `true` | replace strings.Index etc. with strings.Cut |
| `stringscutprefix` | `true` | replace HasPrefix/TrimPrefix with CutPrefix |
| `stringsseq` | `true` | replace ranging over Split/Fields with SplitSeq/FieldsSeq |
| `structtag` | `true` | check that struct field tags conform to reflect.StructTag.Get |
| `testingcontext` | `true` | replace context.WithCancel with t.Context in tests |
| `testinggoroutine` | `true` | report calls to (*testing.T).Fatal from goroutines started by a test |
| `tests` | `true` | check for common mistaken usages of tests and examples |
| `timeformat` | `true` | check for calls of (time.Time).Format or time.Parse with 2006-02-01 |
| `unmarshal` | `true` | report passing non-pointer or non-interface values to unmarshal |
| `unreachable` | `true` | check for unreachable code |
| `unsafefuncs` | `true` | replace unsafe pointer arithmetic with function calls |
| `unsafeptr` | `true` | check for invalid conversions of uintptr to unsafe.Pointer |
| `unusedfunc` | `true` | check for unused functions, methods, etc |
| `unusedparams` | `true` | check for unused parameters of functions |
| `unusedresult` | `true` | check for unused results of calls to some functions |
| `unusedvariable` | `true` | check for unused variables and suggest fixes |
| `unusedwrite` | `true` | checks for unused writes |
| `waitgroup` | `true` | check for misuses of sync.WaitGroup |
| `waitgroupgo` | `true` | replace wg.Add(1)/go/wg.Done() with wg.Go |
| `writestring` | `true` | detect inefficient string concatenation in uses of WriteString |
| `yield` | `true` | report calls to yield where the result is ignored |

## Analyzers

### `QF1001`

**Type:** `boolean` · **Default:** `false`

Apply De Morgan's law

Available since
    2021.1

### `QF1002`

**Type:** `boolean` · **Default:** `true`

Convert untagged switch to tagged switch

An untagged switch that compares a single variable against a series of
values can be replaced with a tagged switch.

Before:

    switch {
    case x == 1 || x == 2, x == 3:
        ...
    case x == 4:
        ...
    default:
        ...
    }

After:

    switch x {
    case 1, 2, 3:
        ...
    case 4:
        ...
    default:
        ...
    }

Available since
    2021.1

### `QF1003`

**Type:** `boolean` · **Default:** `true`

Convert if/else-if chain to tagged switch

A series of if/else-if checks comparing the same variable against
values can be replaced with a tagged switch.

Before:

    if x == 1 || x == 2 {
        ...
    } else if x == 3 {
        ...
    } else {
        ...
    }

After:

    switch x {
    case 1, 2:
        ...
    case 3:
        ...
    default:
        ...
    }

Available since
    2021.1

### `QF1004`

**Type:** `boolean` · **Default:** `true`

Use strings.ReplaceAll instead of strings.Replace with n == -1

Available since
    2021.1

### `QF1005`

**Type:** `boolean` · **Default:** `false`

Expand call to math.Pow

Some uses of math.Pow can be simplified to basic multiplication.

Before:

    math.Pow(x, 2)

After:

    x * x

Available since
    2021.1

### `QF1006`

**Type:** `boolean` · **Default:** `false`

Lift if+break into loop condition

Before:

    for {
        if done {
            break
        }
        ...
    }

After:

    for !done {
        ...
    }

Available since
    2021.1

### `QF1007`

**Type:** `boolean` · **Default:** `false`

Merge conditional assignment into variable declaration

Before:

    x := false
    if someCondition {
        x = true
    }

After:

    x := someCondition

Available since
    2021.1

### `QF1008`

**Type:** `boolean` · **Default:** `false`

Omit embedded fields from selector expression

Available since
    2021.1

### `QF1009`

**Type:** `boolean` · **Default:** `true`

Use time.Time.Equal instead of == operator

Available since
    2021.1

### `QF1010`

**Type:** `boolean` · **Default:** `true`

Convert slice of bytes to string when printing it

Available since
    2021.1

### `QF1011`

**Type:** `boolean` · **Default:** `false`

Omit redundant type from variable declaration

Available since
    2021.1

### `QF1012`

**Type:** `boolean` · **Default:** `true`

Use fmt.Fprintf(x, ...) instead of x.Write(fmt.Sprintf(...))

Available since
    2022.1

### `S1000`

**Type:** `boolean` · **Default:** `true`

Use plain channel send or receive instead of single-case select

Select statements with a single case can be replaced with a simple
send or receive.

Before:

    select {
    case x := <-ch:
        fmt.Println(x)
    }

After:

    x := <-ch
    fmt.Println(x)

Available since
    2017.1

### `S1001`

**Type:** `boolean` · **Default:** `true`

Replace for loop with call to copy

Use copy() for copying elements from one slice to another. For
arrays of identical size, you can use simple assignment.

Before:

    for i, x := range src {
        dst[i] = x
    }

After:

    copy(dst, src)

Available since
    2017.1

### `S1002`

**Type:** `boolean` · **Default:** `false`

Omit comparison with boolean constant

Before:

    if x == true {}

After:

    if x {}

Available since
    2017.1

### `S1003`

**Type:** `boolean` · **Default:** `true`

Replace call to strings.Index with strings.Contains

Before:

    if strings.Index(x, y) != -1 {}

After:

    if strings.Contains(x, y) {}

Available since
    2017.1

### `S1004`

**Type:** `boolean` · **Default:** `true`

Replace call to bytes.Compare with bytes.Equal

Before:

    if bytes.Compare(x, y) == 0 {}

After:

    if bytes.Equal(x, y) {}

Available since
    2017.1

### `S1005`

**Type:** `boolean` · **Default:** `false`

Drop unnecessary use of the blank identifier

In many cases, assigning to the blank identifier is unnecessary.

Before:

    for _ = range s {}
    _ = <-ch

After:

    for range s{}
    <-ch

Available since
    2017.1

### `S1006`

**Type:** `boolean` · **Default:** `false`

Use 'for &#123; ... &#125;' for infinite loops

For infinite loops, using for &#123; ... &#125; is the most idiomatic choice.

Available since
    2017.1

### `S1007`

**Type:** `boolean` · **Default:** `true`

Simplify regular expression by using raw string literal

Raw string literals use backticks instead of quotation marks and do not support
any escape sequences. This means that the backslash can be used
freely, without the need of escaping.

Since regular expressions have their own escape sequences, raw strings
can improve their readability.

Before:

    regexp.Compile("\\A(\\w+) profile: total \\d+\\n\\z")

After:

    regexp.Compile(`\A(\w+) profile: total \d+\n\z`)

Available since
    2017.1

### `S1008`

**Type:** `boolean` · **Default:** `false`

Simplify returning boolean expression

Before:

    if <expr> {
        return true
    }
    return false

After:

    return <expr>

Available since
    2017.1

### `S1009`

**Type:** `boolean` · **Default:** `true`

Omit redundant nil check on slices, maps, and channels

The len function is defined for all slices, maps, and
channels, even nil ones, which have a length of zero. It is not necessary to
check for nil before checking that their length is not zero.

Before:

    if x != nil && len(x) != 0 {}

After:

    if len(x) != 0 {}

Available since
    2017.1

### `S1010`

**Type:** `boolean` · **Default:** `true`

Omit default slice index

When slicing, the second index defaults to the length of the value,
making s[n:len(s)] and s[n:] equivalent.

Available since
    2017.1

### `S1011`

**Type:** `boolean` · **Default:** `false`

Use a single append to concatenate two slices

Before:

    for _, e := range y {
        x = append(x, e)
    }
    
    for i := range y {
        x = append(x, y[i])
    }
    
    for i := range y {
        v := y[i]
        x = append(x, v)
    }

After:

    x = append(x, y...)
    x = append(x, y...)
    x = append(x, y...)

Available since
    2017.1

### `S1012`

**Type:** `boolean` · **Default:** `true`

Replace time.Now().Sub(x) with time.Since(x)

The time.Since helper has the same effect as using time.Now().Sub(x)
but is easier to read.

Before:

    time.Now().Sub(x)

After:

    time.Since(x)

Available since
    2017.1

### `S1016`

**Type:** `boolean` · **Default:** `false`

Use a type conversion instead of manually copying struct fields

Two struct types with identical fields can be converted between each
other. In older versions of Go, the fields had to have identical
struct tags. Since Go 1.8, however, struct tags are ignored during
conversions. It is thus not necessary to manually copy every field
individually.

Before:

    var x T1
    y := T2{
        Field1: x.Field1,
        Field2: x.Field2,
    }

After:

    var x T1
    y := T2(x)

Available since
    2017.1

### `S1017`

**Type:** `boolean` · **Default:** `true`

Replace manual trimming with strings.TrimPrefix

Instead of using strings.HasPrefix and manual slicing, use the
strings.TrimPrefix function. If the string doesn't start with the
prefix, the original string will be returned. Using strings.TrimPrefix
reduces complexity, and avoids common bugs, such as off-by-one
mistakes.

Before:

    if strings.HasPrefix(str, prefix) {
        str = str[len(prefix):]
    }

After:

    str = strings.TrimPrefix(str, prefix)

Available since
    2017.1

### `S1018`

**Type:** `boolean` · **Default:** `true`

Use 'copy' for sliding elements

copy() permits using the same source and destination slice, even with
overlapping ranges. This makes it ideal for sliding elements in a
slice.

Before:

    for i := 0; i < n; i++ {
        bs[i] = bs[offset+i]
    }

After:

    copy(bs[:n], bs[offset:])

Available since
    2017.1

### `S1019`

**Type:** `boolean` · **Default:** `true`

Simplify 'make' call by omitting redundant arguments

The 'make' function has default values for the length and capacity
arguments. For channels, the length defaults to zero, and for slices,
the capacity defaults to the length.

Available since
    2017.1

### `S1020`

**Type:** `boolean` · **Default:** `true`

Omit redundant nil check in type assertion

Before:

    if _, ok := i.(T); ok && i != nil {}

After:

    if _, ok := i.(T); ok {}

Available since
    2017.1

### `S1021`

**Type:** `boolean` · **Default:** `false`

Merge variable declaration and assignment

Before:

    var x uint
    x = 1

After:

    var x uint = 1

Available since
    2017.1

### `S1023`

**Type:** `boolean` · **Default:** `true`

Omit redundant control flow

Functions that have no return value do not need a return statement as
the final statement of the function.

Switches in Go do not have automatic fallthrough, unlike languages
like C. It is not necessary to have a break statement as the final
statement in a case block.

Available since
    2017.1

### `S1024`

**Type:** `boolean` · **Default:** `true`

Replace x.Sub(time.Now()) with time.Until(x)

The time.Until helper has the same effect as using x.Sub(time.Now())
but is easier to read.

Before:

    x.Sub(time.Now())

After:

    time.Until(x)

Available since
    2017.1

### `S1025`

**Type:** `boolean` · **Default:** `false`

Don't use fmt.Sprintf("%s", x) unnecessarily

In many instances, there are easier and more efficient ways of getting
a value's string representation. Whenever a value's underlying type is
a string already, or the type has a String method, they should be used
directly.

Given the following shared definitions

    type T1 string
    type T2 int

    func (T2) String() string { return "Hello, world" }

    var x string
    var y T1
    var z T2

we can simplify

    fmt.Sprintf("%s", x)
    fmt.Sprintf("%s", y)
    fmt.Sprintf("%s", z)

to

    x
    string(y)
    z.String()

Available since
    2017.1

### `S1028`

**Type:** `boolean` · **Default:** `true`

Simplify error construction with fmt.Errorf

Before:

    errors.New(fmt.Sprintf(...))

After:

    fmt.Errorf(...)

Available since
    2017.1

### `S1029`

**Type:** `boolean` · **Default:** `false`

Range over the string directly

Ranging over a string will yield byte offsets and runes. If the offset
isn't used, this is functionally equivalent to converting the string
to a slice of runes and ranging over that. Ranging directly over the
string will be more performant, however, as it avoids allocating a new
slice, the size of which depends on the length of the string.

Before:

    for _, r := range []rune(s) {}

After:

    for _, r := range s {}

Available since
    2017.1

### `S1030`

**Type:** `boolean` · **Default:** `true`

Use bytes.Buffer.String or bytes.Buffer.Bytes

bytes.Buffer has both a String and a Bytes method. It is almost never
necessary to use string(buf.Bytes()) or []byte(buf.String()) – simply
use the other method.

The only exception to this are map lookups. Due to a compiler optimization,
m[string(buf.Bytes())] is more efficient than m[buf.String()].

Available since
    2017.1

### `S1031`

**Type:** `boolean` · **Default:** `true`

Omit redundant nil check around loop

You can use range on nil slices and maps, the loop will simply never
execute. This makes an additional nil check around the loop
unnecessary.

Before:

    if s != nil {
        for _, x := range s {
            ...
        }
    }

After:

    for _, x := range s {
        ...
    }

Available since
    2017.1

### `S1032`

**Type:** `boolean` · **Default:** `true`

Use sort.Ints(x), sort.Float64s(x), and sort.Strings(x)

The sort.Ints, sort.Float64s and sort.Strings functions are easier to
read than sort.Sort(sort.IntSlice(x)), sort.Sort(sort.Float64Slice(x))
and sort.Sort(sort.StringSlice(x)).

Before:

    sort.Sort(sort.StringSlice(x))

After:

    sort.Strings(x)

Available since
    2019.1

### `S1033`

**Type:** `boolean` · **Default:** `true`

Unnecessary guard around call to 'delete'

Calling delete on a nil map is a no-op.

Available since
    2019.2

### `S1034`

**Type:** `boolean` · **Default:** `true`

Use result of type assertion to simplify cases

Available since
    2019.2

### `S1035`

**Type:** `boolean` · **Default:** `true`

Redundant call to net/http.CanonicalHeaderKey in method call on net/http.Header

The methods on net/http.Header, namely Add, Del, Get
and Set, already canonicalize the given header name.

Available since
    2020.1

### `S1036`

**Type:** `boolean` · **Default:** `true`

Unnecessary guard around map access

When accessing a map key that doesn't exist yet, one receives a zero
value. Often, the zero value is a suitable value, for example when
using append or doing integer math.

The following

    if _, ok := m["foo"]; ok {
        m["foo"] = append(m["foo"], "bar")
    } else {
        m["foo"] = []string{"bar"}
    }

can be simplified to

    m["foo"] = append(m["foo"], "bar")

and

    if _, ok := m2["k"]; ok {
        m2["k"] += 4
    } else {
        m2["k"] = 4
    }

can be simplified to

    m["k"] += 4

Available since
    2020.1

### `S1037`

**Type:** `boolean` · **Default:** `true`

Elaborate way of sleeping

Using a select statement with a single case receiving
from the result of time.After is a very elaborate way of sleeping that
can much simpler be expressed with a simple call to time.Sleep.

Available since
    2020.1

### `S1038`

**Type:** `boolean` · **Default:** `true`

Unnecessarily complex way of printing formatted string

Instead of using fmt.Print(fmt.Sprintf(...)), one can use fmt.Printf(...).

Available since
    2020.1

### `S1039`

**Type:** `boolean` · **Default:** `true`

Unnecessary use of fmt.Sprint

Calling fmt.Sprint with a single string argument is unnecessary
and identical to using the string directly.

Available since
    2020.1

### `S1040`

**Type:** `boolean` · **Default:** `true`

Type assertion to current type

The type assertion x.(SomeInterface), when x already has type
SomeInterface, can only fail if x is nil. Usually, this is
left-over code from when x had a different type and you can safely
delete the type assertion. If you want to check that x is not nil,
consider being explicit and using an actual if x == nil comparison
instead of relying on the type assertion panicking.

Available since
    2021.1

### `SA1000`

**Type:** `boolean` · **Default:** `false`

Invalid regular expression

Available since
    2017.1

### `SA1001`

**Type:** `boolean` · **Default:** `true`

Invalid template

Available since
    2017.1

### `SA1002`

**Type:** `boolean` · **Default:** `false`

Invalid format in time.Parse

time.Parse requires a layout string that uses Go's reference time:
'Mon Jan 2 15:04:05 MST 2006'. The layout must represent this date and time
exactly. See https://pkg.go.dev/time#pkg-constants for layout examples.

Available since
    2017.1

### `SA1003`

**Type:** `boolean` · **Default:** `false`

Unsupported argument to functions in encoding/binary

The encoding/binary package can only serialize types with known sizes.
This precludes the use of the int and uint types, as their sizes
differ on different architectures. Furthermore, it doesn't support
serializing maps, channels, strings, or functions.

Before Go 1.8, bool wasn't supported, either.

Available since
    2017.1

### `SA1004`

**Type:** `boolean` · **Default:** `true`

Suspiciously small untyped constant in time.Sleep

The time.Sleep function takes a time.Duration as its only argument.
Durations are expressed in nanoseconds. Thus, calling time.Sleep(1)
will sleep for 1 nanosecond. This is a common source of bugs, as sleep
functions in other languages often accept seconds or milliseconds.

The time package provides constants such as time.Second to express
large durations. These can be combined with arithmetic to express
arbitrary durations, for example 5 * time.Second for 5 seconds.

If you truly meant to sleep for a tiny amount of time, use
n * time.Nanosecond to signal to Staticcheck that you did mean to sleep
for some amount of nanoseconds.

Available since
    2017.1

### `SA1005`

**Type:** `boolean` · **Default:** `true`

Invalid first argument to exec.Command

os/exec runs programs directly (using variants of the fork and exec
system calls on Unix systems). This shouldn't be confused with running
a command in a shell. The shell will allow for features such as input
redirection, pipes, and general scripting. The shell is also
responsible for splitting the user's input into a program name and its
arguments. For example, the equivalent to

    ls / /tmp

would be

    exec.Command("ls", "/", "/tmp")

If you want to run a command in a shell, consider using something like
the following – but be aware that not all systems, particularly
Windows, will have a /bin/sh program:

    exec.Command("/bin/sh", "-c", "ls | grep Awesome")

Available since
    2017.1

### `SA1007`

**Type:** `boolean` · **Default:** `false`

Invalid URL in net/url.Parse

Available since
    2017.1

### `SA1008`

**Type:** `boolean` · **Default:** `true`

Non-canonical key in http.Header map

Keys in http.Header maps are canonical, meaning they follow a specific
combination of uppercase and lowercase letters. Methods such as
http.Header.Add and http.Header.Del convert inputs into this canonical
form before manipulating the map.

When manipulating http.Header maps directly, as opposed to using the
provided methods, care should be taken to stick to canonical form in
order to avoid inconsistencies. The following piece of code
demonstrates one such inconsistency:

    h := http.Header{}
    h["etag"] = []string{"1234"}
    h.Add("etag", "5678")
    fmt.Println(h)

    // Output:
    // map[Etag:[5678] etag:[1234]]

The easiest way of obtaining the canonical form of a key is to use
http.CanonicalHeaderKey.

Available since
    2017.1

### `SA1010`

**Type:** `boolean` · **Default:** `false`

(*regexp.Regexp).FindAll called with n == 0, which will always return zero results

If n >= 0, the function returns at most n matches/submatches. To
return all results, specify a negative number.

Available since
    2017.1

### `SA1011`

**Type:** `boolean` · **Default:** `false`

Various methods in the 'strings' package expect valid UTF-8, but invalid input is provided

Available since
    2017.1

### `SA1012`

**Type:** `boolean` · **Default:** `true`

A nil context.Context is being passed to a function, consider using context.TODO instead

The context package prohibits the use of a nil context.
If no parent context is available, a new context should be used,
e.g. context.TODO or context.Background.

Available since
    2017.1

### `SA1013`

**Type:** `boolean` · **Default:** `true`

io.Seeker.Seek is being called with the whence constant as the first argument, but it should be the second

Available since
    2017.1

### `SA1014`

**Type:** `boolean` · **Default:** `false`

Non-pointer value passed to Unmarshal or Decode

Functions such as encoding/json.Unmarshal and
(*encoding/json.Decoder).Decode require a pointer to the value that should
be populated. Passing a non-pointer value results in the function returning an
error at runtime, as it cannot modify the target value.

Available since
    2017.1

### `SA1015`

**Type:** `boolean` · **Default:** `false`

Using time.Tick in a way that will leak. Consider using time.NewTicker, and only use time.Tick in tests, commands and endless functions

Before Go 1.23, time.Tickers had to be closed to be able to be garbage
collected. Since time.Tick doesn't make it possible to close the underlying
ticker, using it repeatedly would leak memory.

Go 1.23 fixes this by allowing tickers to be collected even if they weren't closed.

Available since
    2017.1

### `SA1016`

**Type:** `boolean` · **Default:** `true`

Trapping a signal that cannot be trapped

Not all signals can be intercepted by a process. Specifically, on
UNIX-like systems, the syscall.SIGKILL and syscall.SIGSTOP signals are
never passed to the process, but instead handled directly by the
kernel. It is therefore pointless to try and handle these signals.

Available since
    2017.1

### `SA1017`

**Type:** `boolean` · **Default:** `false`

Channels used with os/signal.Notify should be buffered

The os/signal package uses non-blocking channel sends when delivering
signals. If the receiving end of the channel isn't ready and the
channel is either unbuffered or full, the signal will be dropped. To
avoid missing signals, the channel should be buffered and of the
appropriate size. For a channel used for notification of just one
signal value, a buffer of size 1 is sufficient.

Available since
    2017.1

### `SA1018`

**Type:** `boolean` · **Default:** `false`

strings.Replace called with n == 0, which does nothing

With n == 0, zero instances will be replaced. To replace all
instances, use a negative number, or use strings.ReplaceAll.

Available since
    2017.1

### `SA1020`

**Type:** `boolean` · **Default:** `false`

Using an invalid host:port pair with a net.Listen-related function

Functions such as net.Listen, net.ListenTCP, and similar,
expect a valid network address in the form of host:port. The host, the port,
or both, can be omitted, e.g. localhost:8080, :8080 or : are valid
host:port pairs.
See https://pkg.go.dev/net#Listen for the full documentation.

Available since
    2017.1

### `SA1021`

**Type:** `boolean` · **Default:** `false`

Using bytes.Equal to compare two net.IP

A net.IP stores an IPv4 or IPv6 address as a slice of bytes. The
length of the slice for an IPv4 address, however, can be either 4 or
16 bytes long, using different ways of representing IPv4 addresses. In
order to correctly compare two net.IPs, the net.IP.Equal method should
be used, as it takes both representations into account.

Available since
    2017.1

### `SA1023`

**Type:** `boolean` · **Default:** `false`

Modifying the buffer in an io.Writer implementation

Write must not modify the slice data, even temporarily.

Available since
    2017.1

### `SA1024`

**Type:** `boolean` · **Default:** `false`

A string cutset contains duplicate characters

The strings.TrimLeft and strings.TrimRight functions take cutsets, not
prefixes. A cutset is treated as a set of characters to remove from a
string. For example,

    strings.TrimLeft("42133word", "1234")

will result in the string "word" – any characters that are 1, 2, 3 or
4 are cut from the left of the string.

In order to remove one string from another, use strings.TrimPrefix instead.

Available since
    2017.1

### `SA1025`

**Type:** `boolean` · **Default:** `false`

It is not possible to use (*time.Timer).Reset's return value correctly

Available since
    2019.1

### `SA1026`

**Type:** `boolean` · **Default:** `false`

Cannot marshal channels or functions

Available since
    2019.2

### `SA1027`

**Type:** `boolean` · **Default:** `false`

Atomic access to 64-bit variable must be 64-bit aligned

On ARM, x86-32, and 32-bit MIPS, it is the caller's responsibility to
arrange for 64-bit alignment of 64-bit words accessed atomically. The
first word in a variable or in an allocated struct, array, or slice
can be relied upon to be 64-bit aligned.

You can use the structlayout tool to inspect the alignment of fields
in a struct.

Available since
    2019.2

### `SA1028`

**Type:** `boolean` · **Default:** `false`

sort.Slice can only be used on slices

The first argument of sort.Slice must be a slice.

Available since
    2020.1

### `SA1029`

**Type:** `boolean` · **Default:** `false`

Inappropriate key in call to context.WithValue

The provided key must be comparable and should not be
of type string or any other built-in type to avoid collisions between
packages using context. Users of WithValue should define their own
types for keys.

To avoid allocating when assigning to an interface&#123;&#125;,
context keys often have concrete type struct&#123;&#125;. Alternatively,
exported context key variables' static type should be a pointer or
interface.

Available since
    2020.1

### `SA1030`

**Type:** `boolean` · **Default:** `false`

Invalid argument in call to a strconv function

This check validates the format, number base and bit size arguments of
the various parsing and formatting functions in strconv.

Available since
    2021.1

### `SA1031`

**Type:** `boolean` · **Default:** `false`

Overlapping byte slices passed to an encoder

In an encoding function of the form Encode(dst, src), dst and
src were found to reference the same memory. This can result in
src bytes being overwritten before they are read, when the encoder
writes more than one byte per src byte.

Available since
    2024.1

### `SA1032`

**Type:** `boolean` · **Default:** `false`

Wrong order of arguments to errors.Is

The first argument of the function errors.Is is the error
that we have and the second argument is the error we're trying to match against.
For example:

	if errors.Is(err, io.EOF) { ... }

This check detects some cases where the two arguments have been swapped. It
flags any calls where the first argument is referring to a package-level error
variable, such as

	if errors.Is(io.EOF, err) { /* this is wrong */ }

Available since
    2024.1

### `SA2001`

**Type:** `boolean` · **Default:** `true`

Empty critical section, did you mean to defer the unlock?

Empty critical sections of the kind

    mu.Lock()
    mu.Unlock()

are very often a typo, and the following was intended instead:

    mu.Lock()
    defer mu.Unlock()

Do note that sometimes empty critical sections can be useful, as a
form of signaling to wait on another goroutine. Many times, there are
simpler ways of achieving the same effect. When that isn't the case,
the code should be amply commented to avoid confusion. Combining such
comments with a //lint:ignore directive can be used to suppress this
rare false positive.

Available since
    2017.1

### `SA2002`

**Type:** `boolean` · **Default:** `false`

Called testing.T.FailNow or SkipNow in a goroutine, which isn't allowed

Available since
    2017.1

### `SA2003`

**Type:** `boolean` · **Default:** `false`

Deferred Lock right after locking, likely meant to defer Unlock instead

Deferring a call to Lock immediately after locking is almost always
a typo. For example:

    mu.Lock()
    defer mu.Lock()

While this does not strictly guarantee a deadlock depending on how the
surrounding code is structured, it is highly likely to be a mistake.
The intended code was likely this:

    mu.Lock()
    defer mu.Unlock()

Available since
    2017.1

### `SA3000`

**Type:** `boolean` · **Default:** `true`

TestMain doesn't call os.Exit, hiding test failures

Test executables (and in turn 'go test') exit with a non-zero status
code if any tests failed. When specifying your own TestMain function,
it is your responsibility to arrange for this, by calling os.Exit with
the correct code. The correct code is returned by (*testing.M).Run, so
the usual way of implementing TestMain is to end it with
os.Exit(m.Run()).

Available since
    2017.1

### `SA3001`

**Type:** `boolean` · **Default:** `true`

Assigning to b.N in benchmarks distorts the results

The testing package dynamically sets b.N to improve the reliability of
benchmarks and uses it in computations to determine the duration of a
single operation. Benchmark code must not alter b.N as this would
falsify results.

Available since
    2017.1

### `SA4000`

**Type:** `boolean` · **Default:** `true`

Binary operator has identical expressions on both sides

Available since
    2017.1

### `SA4001`

**Type:** `boolean` · **Default:** `true`

&*x gets simplified to x, it does not copy x

Available since
    2017.1

### `SA4003`

**Type:** `boolean` · **Default:** `true`

Comparing unsigned values against negative values is pointless

Available since
    2017.1

### `SA4004`

**Type:** `boolean` · **Default:** `true`

The loop exits unconditionally after one iteration

Available since
    2017.1

### `SA4005`

**Type:** `boolean` · **Default:** `false`

Field assignment that will never be observed. Did you mean to use a pointer receiver?

Available since
    2021.1

### `SA4006`

**Type:** `boolean` · **Default:** `false`

A value assigned to a variable is never read before being overwritten. Forgotten error check or dead code?

Available since
    2017.1

### `SA4008`

**Type:** `boolean` · **Default:** `false`

The variable in the loop condition never changes, are you incrementing the wrong variable?

For example:

	for i := 0; i < 10; j++ { ... }

This may also occur when a loop can only execute once because of unconditional
control flow that terminates the loop. For example, when a loop body contains an
unconditional break, return, or panic:

	func f() {
		panic("oops")
	}
	func g() {
		for i := 0; i < 10; i++ {
			// f unconditionally calls panic, which means "i" is
			// never incremented.
			f()
		}
	}

Available since
    2017.1

### `SA4009`

**Type:** `boolean` · **Default:** `false`

A function argument is overwritten before its first use

Available since
    2017.1

### `SA4010`

**Type:** `boolean` · **Default:** `false`

The result of append will never be observed anywhere

Calls to append produce a new slice value. When the result of
append is assigned to a variable that is never subsequently read, the
append operation may have an unintended effect.

Available since
    2017.1

### `SA4011`

**Type:** `boolean` · **Default:** `true`

Break statement with no effect. Did you mean to break out of an outer loop?

Available since
    2017.1

### `SA4012`

**Type:** `boolean` · **Default:** `false`

Comparing a value against NaN even though no value is equal to NaN

Available since
    2017.1

### `SA4013`

**Type:** `boolean` · **Default:** `true`

Negating a boolean twice (!!b) is the same as writing b. This is either redundant, or a typo.

Available since
    2017.1

### `SA4014`

**Type:** `boolean` · **Default:** `true`

An if/else if chain has repeated conditions and no side-effects; if the condition didn't match the first time, it won't match the second time, either

Available since
    2017.1

### `SA4015`

**Type:** `boolean` · **Default:** `false`

Calling functions like math.Ceil on floats converted from integers doesn't do anything useful

Available since
    2017.1

### `SA4016`

**Type:** `boolean` · **Default:** `true`

Certain bitwise operations, such as x ^ 0, do not do anything useful

Available since
    2017.1

### `SA4017`

**Type:** `boolean` · **Default:** `false`

Discarding the return values of a function without side effects, making the call pointless

Available since
    2017.1

### `SA4018`

**Type:** `boolean` · **Default:** `false`

Self-assignment of variables

Available since
    2017.1

### `SA4019`

**Type:** `boolean` · **Default:** `true`

Multiple, identical build constraints in the same file

Available since
    2017.1

### `SA4020`

**Type:** `boolean` · **Default:** `true`

Unreachable case clause in a type switch

In a type switch like the following

    type T struct{}
    func (T) Read(b []byte) (int, error) { return 0, nil }

    var v any = T{}

    switch v.(type) {
    case io.Reader:
        // ...
    case T:
        // unreachable
    }

the second case clause can never be reached because T implements
io.Reader and case clauses are evaluated in source order.

Another example:

    type T struct{}
    func (T) Read(b []byte) (int, error) { return 0, nil }
    func (T) Close() error { return nil }

    var v any = T{}

    switch v.(type) {
    case io.Reader:
        // ...
    case io.ReadCloser:
        // unreachable
    }

Even though T has a Close method and thus implements io.ReadCloser,
io.Reader will always match first. The method set of io.Reader is a
subset of io.ReadCloser. Thus it is impossible to match the second
case without matching the first case.


Structurally equivalent interfaces

A special case of the previous example are structurally identical
interfaces. Given these declarations

    type T error
    type V error

    func doSomething() error {
        err, ok := doAnotherThing()
        if ok {
            return T(err)
        }

        return U(err)
    }

the following type switch will have an unreachable case clause:

    switch doSomething().(type) {
    case T:
        // ...
    case V:
        // unreachable
    }

T will always match before V because they are structurally equivalent
and therefore doSomething()'s return value implements both.

Available since
    2019.2

### `SA4022`

**Type:** `boolean` · **Default:** `true`

Comparing the address of a variable against nil

Code such as 'if &x == nil' is meaningless, because taking the address of a variable always yields a non-nil pointer.

Available since
    2020.1

### `SA4023`

**Type:** `boolean` · **Default:** `false`

Impossible comparison of interface value with untyped nil

Under the covers, interfaces are implemented as two elements, a
type T and a value V. V is a concrete value such as an int,
struct or pointer, never an interface itself, and has type T. For
instance, if we store the int value 3 in an interface, the
resulting interface value has, schematically, (T=int, V=3). The
value V is also known as the interface's dynamic value, since a
given interface variable might hold different values V (and
corresponding types T) during the execution of the program.

An interface value is nil only if the V and T are both
unset, (T=nil, V is not set), In particular, a nil interface will
always hold a nil type. If we store a nil pointer of type *int
inside an interface value, the inner type will be *int regardless
of the value of the pointer: (T=*int, V=nil). Such an interface
value will therefore be non-nil even when the pointer value V
inside is nil.

This situation can be confusing, and arises when a nil value is
stored inside an interface value such as an error return:

    func returnsError() error {
        var p *MyError = nil
        if bad() {
            p = ErrBad
        }
        return p // Will always return a non-nil error.
    }

If all goes well, the function returns a nil p, so the return
value is an error interface value holding (T=*MyError, V=nil).
This means that if the caller compares the returned error to nil,
it will always look as if there was an error even if nothing bad
happened. To return a proper nil error to the caller, the
function must return an explicit nil:

    func returnsError() error {
        if bad() {
            return ErrBad
        }
        return nil
    }

It's a good idea for functions that return errors always to use
the error type in their signature (as we did above) rather than a
concrete type such as *MyError, to help guarantee the error is
created correctly. As an example, os.Open returns an error even
though, if not nil, it's always of concrete type *os.PathError.

Similar situations to those described here can arise whenever
interfaces are used. Just keep in mind that if any concrete value
has been stored in the interface, the interface will not be nil.
For more information, see The Laws of
Reflection at https://golang.org/doc/articles/laws_of_reflection.html.

This text has been copied from
https://golang.org/doc/faq#nil_error, licensed under the Creative
Commons Attribution 3.0 License.

Available since
    2020.2

### `SA4024`

**Type:** `boolean` · **Default:** `true`

Checking for impossible return value from a builtin function

Return values of the len and cap builtins cannot be negative.

See https://golang.org/pkg/builtin/#len and https://golang.org/pkg/builtin/#cap.

Example:

    if len(slice) < 0 {
        fmt.Println("unreachable code")
    }

Available since
    2021.1

### `SA4025`

**Type:** `boolean` · **Default:** `true`

Integer division of literals that results in zero

When dividing two integer constants, the result will
also be an integer. Thus, a division such as 2 / 3 results in 0.
This is true for all of the following examples:

	_ = 2 / 3
	const _ = 2 / 3
	const _ float64 = 2 / 3
	_ = float64(2 / 3)

Staticcheck will flag such divisions if both sides of the division are
integer literals, as it is highly unlikely that the division was
intended to truncate to zero. Staticcheck will not flag integer
division involving named constants, to avoid noisy positives.

Available since
    2021.1

### `SA4026`

**Type:** `boolean` · **Default:** `true`

Go constants cannot express negative zero

In IEEE 754 floating point math, zero has a sign and can be positive
or negative. This can be useful in certain numerical code.

Go constants, however, cannot express negative zero. This means that
the literals -0.0 and 0.0 have the same ideal value (zero) and
will both represent positive zero at runtime.

To explicitly and reliably create a negative zero, you can use the
math.Copysign function: math.Copysign(0, -1).

Available since
    2021.1

### `SA4027`

**Type:** `boolean` · **Default:** `true`

(*net/url.URL).Query returns a copy, modifying it doesn't change the URL

(*net/url.URL).Query parses the current value of net/url.URL.RawQuery
and returns it as a map of type net/url.Values. Subsequent changes to
this map will not affect the URL unless the map gets encoded and
assigned to the URL's RawQuery.

As a consequence, the following code pattern is an expensive no-op:
u.Query().Add(key, value).

Available since
    2021.1

### `SA4028`

**Type:** `boolean` · **Default:** `true`

x % 1 is always zero

Available since
    2022.1

### `SA4029`

**Type:** `boolean` · **Default:** `true`

Ineffective attempt at sorting slice

sort.Float64Slice, sort.IntSlice, and sort.StringSlice are
types, not functions. Doing x = sort.StringSlice(x) does nothing,
especially not sort any values. The correct usage is
sort.Sort(sort.StringSlice(x)) or sort.StringSlice(x).Sort(),
but there are more convenient helpers, namely sort.Float64s,
sort.Ints, and sort.Strings.

Available since
    2022.1

### `SA4030`

**Type:** `boolean` · **Default:** `true`

Ineffective attempt at generating random number

Functions in the math/rand package that accept upper limits, such
as Intn, generate random numbers in the half-open interval [0,n). In
other words, the generated numbers will be >= 0 and &lt; n – they
don't include n. rand.Intn(1) therefore doesn't generate 0
or 1, it always generates 0.

Available since
    2022.1

### `SA4031`

**Type:** `boolean` · **Default:** `false`

Checking never-nil value against nil

Available since
    2022.1

### `SA4032`

**Type:** `boolean` · **Default:** `true`

Comparing runtime.GOOS or runtime.GOARCH against impossible value

Available since
    2024.1

### `SA5000`

**Type:** `boolean` · **Default:** `false`

Assignment to nil map

Available since
    2017.1

### `SA5001`

**Type:** `boolean` · **Default:** `true`

Deferring Close before checking for a possible error

Available since
    2017.1

### `SA5002`

**Type:** `boolean` · **Default:** `false`

The empty for loop ('for &#123;&#125;') spins and can block the scheduler

Available since
    2017.1

### `SA5003`

**Type:** `boolean` · **Default:** `true`

Defers in infinite loops will never execute

Defers are scoped to the surrounding function, not the surrounding
block. In a function that never returns, i.e. one containing an
infinite loop, defers will never execute.

Available since
    2017.1

### `SA5004`

**Type:** `boolean` · **Default:** `true`

'for &#123; select &#123; ...' with an empty default branch spins

Available since
    2017.1

### `SA5005`

**Type:** `boolean` · **Default:** `false`

The finalizer references the finalized object, preventing garbage collection

A finalizer is a function associated with an object that runs when the
garbage collector is ready to collect said object, that is when the
object is no longer referenced by anything.

If the finalizer references the object, however, it will always remain
as the final reference to that object, preventing the garbage
collector from collecting the object. The finalizer will never run,
and the object will never be collected, leading to a memory leak. That
is why the finalizer should instead use its first argument to operate
on the object. That way, the number of references can temporarily go
to zero before the object is being passed to the finalizer.

Available since
    2017.1

### `SA5007`

**Type:** `boolean` · **Default:** `false`

Infinite recursive call

A function that calls itself recursively needs to have an exit
condition. Otherwise it will recurse forever, until the system runs
out of memory.

This issue can be caused by simple bugs such as forgetting to add an
exit condition. It can also happen "on purpose". Some languages have
tail call optimization which makes certain infinite recursive calls
safe to use. Go, however, does not implement TCO, and as such a loop
should be used instead.

Available since
    2017.1

### `SA5008`

**Type:** `boolean` · **Default:** `true`

Invalid struct tag

Available since
    2019.2

### `SA5010`

**Type:** `boolean` · **Default:** `false`

Impossible type assertion

Some type assertions can be statically proven to be
impossible. This is the case when the method sets of both
arguments of the type assertion conflict with each other, for
example by containing the same method with different
signatures.

The Go compiler already applies this check when asserting from an
interface value to a concrete type. If the concrete type misses
methods from the interface, or if function signatures don't match,
then the type assertion can never succeed.

This check applies the same logic when asserting from one interface to
another. If both interface types contain the same method but with
different signatures, then the type assertion can never succeed,
either.

Available since
    2020.1

### `SA5012`

**Type:** `boolean` · **Default:** `false`

Passing odd-sized slice to function expecting even size

Some functions that take slices as parameters expect the slices to have an even number of elements. 
Often, these functions treat elements in a slice as pairs. 
For example, strings.NewReplacer takes pairs of old and new strings, 
and calling it with an odd number of elements would be an error.

Available since
    2020.2

### `SA6000`

**Type:** `boolean` · **Default:** `false`

Using regexp.Match or related in a loop, should use regexp.Compile

Available since
    2017.1

### `SA6001`

**Type:** `boolean` · **Default:** `false`

Missing an optimization opportunity when indexing maps by byte slices

Map keys must be comparable, which precludes the use of byte slices.
This usually leads to using string keys and converting byte slices to
strings.

Normally, a conversion of a byte slice to a string needs to copy the data and
causes allocations. The compiler, however, recognizes m[string(b)] and
uses the data of b directly, without copying it, because it knows that
the data can't change during the map lookup. This leads to the
counter-intuitive situation that

    k := string(b)
    println(m[k])
    println(m[k])

will be less efficient than

    println(m[string(b)])
    println(m[string(b)])

because the first version needs to copy and allocate, while the second
one does not.

For some history on this optimization, check out commit
f5f5a8b6209f84961687d993b93ea0d397f5d5bf in the Go repository.

Available since
    2017.1

### `SA6002`

**Type:** `boolean` · **Default:** `false`

Storing non-pointer values in sync.Pool allocates memory

A sync.Pool is used to avoid unnecessary allocations and reduce the
amount of work the garbage collector has to do.

When passing a value that is not a pointer to a function that accepts
an interface, the value needs to be placed on the heap, which means an
additional allocation. Slices are a common thing to put in sync.Pools,
and they're structs with 3 fields (length, capacity, and a pointer to
an array). In order to avoid the extra allocation, one should store a
pointer to the slice instead.

See the comments on https://go-review.googlesource.com/c/go/+/24371
that discuss this problem.

Available since
    2017.1

### `SA6003`

**Type:** `boolean` · **Default:** `false`

Converting a string to a slice of runes before ranging over it

You may want to loop over the runes in a string. Instead of converting
the string to a slice of runes and looping over that, you can loop
over the string itself. That is,

    for _, r := range s {}

and

    for _, r := range []rune(s) {}

will yield the same values. The first version, however, will be faster
and avoid unnecessary memory allocations.

Do note that if you are interested in the indices, ranging over a
string and over a slice of runes will yield different indices. The
first one yields byte offsets, while the second one yields indices in
the slice of runes.

Available since
    2017.1

### `SA6005`

**Type:** `boolean` · **Default:** `true`

Inefficient string comparison with strings.ToLower or strings.ToUpper

Converting two strings to the same case and comparing them like so

    if strings.ToLower(s1) == strings.ToLower(s2) {
        ...
    }

is significantly more expensive than comparing them with
strings.EqualFold(s1, s2). This is due to memory usage as well as
computational complexity.

strings.ToLower will have to allocate memory for the new strings, as
well as convert both strings fully, even if they differ on the very
first byte. strings.EqualFold, on the other hand, compares the strings
one character at a time. It doesn't need to create two intermediate
strings and can return as soon as the first non-matching character has
been found.

For a more in-depth explanation of this issue, see
https://blog.digitalocean.com/how-to-efficiently-compare-strings-in-go/

Available since
    2019.2

### `SA6006`

**Type:** `boolean` · **Default:** `true`

Using io.WriteString to write []byte

Using io.WriteString to write a slice of bytes, as in

    io.WriteString(w, string(b))

is both unnecessary and inefficient. Converting from []byte to string
has to allocate and copy the data, and we could simply use w.Write(b)
instead.

Available since
    2024.1

### `SA9001`

**Type:** `boolean` · **Default:** `false`

Defers in range loops may not run when you expect them to

Available since
    2017.1

### `SA9002`

**Type:** `boolean` · **Default:** `true`

Using a non-octal os.FileMode that looks like it was meant to be in octal.

Available since
    2017.1

### `SA9003`

**Type:** `boolean` · **Default:** `false`

Empty body in an if or else branch

Available since
    2017.1, non-default

### `SA9004`

**Type:** `boolean` · **Default:** `true`

Only the first constant has an explicit type

In a constant declaration such as the following:

    const (
        First byte = 1
        Second     = 2
    )

the constant Second does not have the same type as the constant First.
This construct shouldn't be confused with

    const (
        First byte = iota
        Second
    )

where First and Second do indeed have the same type. The type is only
passed on when no explicit value is assigned to the constant.

When declaring enumerations with explicit values it is therefore
important not to write

    const (
          EnumFirst EnumType = 1
          EnumSecond         = 2
          EnumThird          = 3
    )

This discrepancy in types can cause various confusing behaviors and
bugs.


Wrong type in variable declarations

The most obvious issue with such incorrect enumerations expresses
itself as a compile error:

    package pkg

    const (
        EnumFirst  uint8 = 1
        EnumSecond       = 2
    )

    func fn(useFirst bool) {
        x := EnumSecond
        if useFirst {
            x = EnumFirst
        }
    }

fails to compile with

    ./const.go:11:5: cannot use EnumFirst (type uint8) as type int in assignment


Losing method sets

A more subtle issue occurs with types that have methods and optional
interfaces. Consider the following:

    package main

    import "fmt"

    type Enum int

    func (e Enum) String() string {
        return "an enum"
    }

    const (
        EnumFirst  Enum = 1
        EnumSecond      = 2
    )

    func main() {
        fmt.Println(EnumFirst)
        fmt.Println(EnumSecond)
    }

This code will output

    an enum
    2

as EnumSecond has no explicit type, and thus defaults to int.

Available since
    2019.1

### `SA9005`

**Type:** `boolean` · **Default:** `false`

Trying to marshal a struct with no public fields nor custom marshaling

The encoding/json and encoding/xml packages only operate on exported
fields in structs, not unexported ones. It is usually an error to try
to (un)marshal structs that only consist of unexported fields.

This check will not flag calls involving types that define custom
marshaling behavior, e.g. via MarshalJSON methods. It will also not
flag empty structs.

Available since
    2019.2

### `SA9006`

**Type:** `boolean` · **Default:** `true`

Dubious bit shifting of a fixed size integer value

Bit shifting a value past its size will always clear the value.

For instance:

    v := int8(42)
    v >>= 8

will always result in 0.

This check flags bit shifting operations on fixed size integer values only.
That is, int, uint and uintptr are never flagged to avoid potential false
positives in somewhat exotic but valid bit twiddling tricks:

    // Clear any value above 32 bits if integers are more than 32 bits.
    func f(i int) int {
        v := i >> 32
        v = v << 32
        return i-v
    }

Available since
    2020.2

### `SA9007`

**Type:** `boolean` · **Default:** `false`

Deleting a directory that shouldn't be deleted

It is virtually never correct to delete system directories such as
/tmp or the user's home directory. However, it can be fairly easy to
do by mistake, for example by mistakenly using os.TempDir instead
of ioutil.TempDir, or by forgetting to add a suffix to the result
of os.UserHomeDir.

Writing

    d := os.TempDir()
    defer os.RemoveAll(d)

in your unit tests will have a devastating effect on the stability of your system.

This check flags attempts at deleting the following directories:

- os.TempDir
- os.UserCacheDir
- os.UserConfigDir
- os.UserHomeDir

Available since
    2022.1

### `SA9008`

**Type:** `boolean` · **Default:** `false`

else branch of a type assertion is probably not reading the right value

When declaring variables as part of an if statement (like in 'if
foo := ...; foo &#123;'), the same variables will also be in the scope of
the else branch. This means that in the following example

    if x, ok := x.(int); ok {
        // ...
    } else {
        fmt.Printf("unexpected type %T", x)
    }

x in the else branch will refer to the x from x, ok
:=; it will not refer to the x that is being type-asserted. The
result of a failed type assertion is the zero value of the type that
is being asserted to, so x in the else branch will always have the
value 0 and the type int.

Available since
    2022.1

### `SA9009`

**Type:** `boolean` · **Default:** `true`

Ineffectual Go compiler directive

A potential Go compiler directive was found, but is ineffectual as it begins
with whitespace.

Available since
    2024.1

### `SA9010`

**Type:** `boolean` · **Default:** `true`

Returned function should be called in defer

If you have a function such as:

    func f() func() {
        // Do something.
        return func() {
            // Do something.
        }
    }

Then calling that in defer:

    defer f()

Is almost always a mistake, since you typically want to call the returned
function:

    defer f()()

Available since
    2026.2

### `ST1000`

**Type:** `boolean` · **Default:** `false`

Incorrect or missing package comment

Packages must have a package comment that is formatted according to
the guidelines laid out in
https://go.dev/wiki/CodeReviewComments#package-comments.

Available since
    2019.1, non-default

### `ST1001`

**Type:** `boolean` · **Default:** `false`

Dot imports are discouraged

Dot imports that aren't in external test packages are discouraged.

The dot_import_whitelist option can be used to whitelist certain
imports.

Quoting Go Code Review Comments:

> The import . form can be useful in tests that, due to circular
> dependencies, cannot be made part of the package being tested:
> 
>     package foo_test
> 
>     import (
>         "bar/testutil" // also imports "foo"
>         . "foo"
>     )
> 
> In this case, the test file cannot be in package foo because it
> uses bar/testutil, which imports foo. So we use the import .
> form to let the file pretend to be part of package foo even though
> it is not. Except for this one case, do not use import . in your
> programs. It makes the programs much harder to read because it is
> unclear whether a name like Quux is a top-level identifier in the
> current package or in an imported package.

Available since
    2019.1

Options
    dot_import_whitelist

### `ST1003`

**Type:** `boolean` · **Default:** `false`

Poorly chosen identifier

Identifiers, such as variable and package names, follow certain rules.

See the following links for details:

- https://go.dev/doc/effective_go#package-names
- https://go.dev/doc/effective_go#mixed-caps
- https://go.dev/wiki/CodeReviewComments#initialisms
- https://go.dev/wiki/CodeReviewComments#variable-names

Available since
    2019.1, non-default

Options
    initialisms

### `ST1005`

**Type:** `boolean` · **Default:** `false`

Incorrectly formatted error string

Error strings follow a set of guidelines to ensure uniformity and good
composability.

Quoting Go Code Review Comments:

> Error strings should not be capitalized (unless beginning with
> proper nouns or acronyms) or end with punctuation, since they are
> usually printed following other context. That is, use
> fmt.Errorf("something bad") not fmt.Errorf("Something bad"), so
> that log.Printf("Reading %s: %v", filename, err) formats without a
> spurious capital letter mid-message.

Available since
    2019.1

### `ST1006`

**Type:** `boolean` · **Default:** `false`

Poorly chosen receiver name

Quoting Go Code Review Comments:

> The name of a method's receiver should be a reflection of its
> identity; often a one or two letter abbreviation of its type
> suffices (such as "c" or "cl" for "Client"). Don't use generic
> names such as "me", "this" or "self", identifiers typical of
> object-oriented languages that place more emphasis on methods as
> opposed to functions. The name need not be as descriptive as that
> of a method argument, as its role is obvious and serves no
> documentary purpose. It can be very short as it will appear on
> almost every line of every method of the type; familiarity admits
> brevity. Be consistent, too: if you call the receiver "c" in one
> method, don't call it "cl" in another.

Available since
    2019.1

### `ST1008`

**Type:** `boolean` · **Default:** `false`

A function's error value should be its last return value

A function's error value should be its last return value.

Available since
    2019.1

### `ST1011`

**Type:** `boolean` · **Default:** `false`

Poorly chosen name for variable of type time.Duration

time.Duration values represent an amount of time, which is represented
as a count of nanoseconds. An expression like 5 * time.Microsecond
yields the value 5000. It is therefore not appropriate to suffix a
variable of type time.Duration with any time unit, such as Msec or
Milli.

Available since
    2019.1

### `ST1012`

**Type:** `boolean` · **Default:** `false`

Poorly chosen name for error variable

Error variables that are part of an API should be called errFoo or
ErrFoo.

Available since
    2019.1

### `ST1013`

**Type:** `boolean` · **Default:** `false`

Should use constants for HTTP error codes, not magic numbers

HTTP has a tremendous number of status codes. While some of those are
well known (200, 400, 404, 500), most of them are not. The net/http
package provides constants for all status codes that are part of the
various specifications. It is recommended to use these constants
instead of hard-coding magic numbers, to vastly improve the
readability of your code.

Available since
    2019.1

Options
    http_status_code_whitelist

### `ST1015`

**Type:** `boolean` · **Default:** `false`

A switch's default case should be the first or last case

Available since
    2019.1

### `ST1016`

**Type:** `boolean` · **Default:** `false`

Use consistent method receiver names

Available since
    2019.1, non-default

### `ST1017`

**Type:** `boolean` · **Default:** `false`

Don't use Yoda conditions

Yoda conditions are conditions of the kind 'if 42 == x', where the
literal is on the left side of the comparison. These are a common
idiom in languages in which assignment is an expression, to avoid bugs
of the kind 'if (x = 42)'. In Go, which doesn't allow for this kind of
bug, we prefer the more idiomatic 'if x == 42'.

Available since
    2019.2

### `ST1018`

**Type:** `boolean` · **Default:** `false`

Avoid zero-width and control characters in string literals

Available since
    2019.2

### `ST1019`

**Type:** `boolean` · **Default:** `false`

Importing the same package multiple times

Go allows importing the same package multiple times, as long as
different import aliases are being used. That is, the following
bit of code is valid:

    import (
        "fmt"
        fumpt "fmt"
        format "fmt"
    )

However, this is very rarely done on purpose. Usually, it is a
sign of code that got refactored, accidentally adding duplicate
import statements. It is also a rarely known feature, which may
contribute to confusion.

Do note that sometimes, this feature may be used
intentionally (see for example
https://github.com/golang/go/commit/3409ce39bfd7584523b7a8c150a310cea92d879d)
– if you want to allow this pattern in your code base, you're
advised to disable this check.

It is acceptable to import the same package twice if one of the imports
uses the blank identifier. This is allowed in order to increase
resilience against erroneous changes when using the same package for its
side effects as well as its exported API.

Available since
    2020.1

### `ST1020`

**Type:** `boolean` · **Default:** `false`

The documentation of an exported function should start with the function's name

Doc comments work best as complete sentences, which
allow a wide variety of automated presentations. The first sentence
should be a one-sentence summary that starts with the name being
declared.

If every doc comment begins with the name of the item it describes,
you can use the doc subcommand of the go tool and run the output
through grep.

See https://go.dev/doc/effective_go#commentary for more
information on how to write good documentation.

Available since
    2020.1, non-default

### `ST1021`

**Type:** `boolean` · **Default:** `false`

The documentation of an exported type should start with type's name

Doc comments work best as complete sentences, which
allow a wide variety of automated presentations. The first sentence
should be a one-sentence summary that starts with the name being
declared.

If every doc comment begins with the name of the item it describes,
you can use the doc subcommand of the go tool and run the output
through grep.

See https://go.dev/doc/effective_go#commentary for more
information on how to write good documentation.

Available since
    2020.1, non-default

### `ST1022`

**Type:** `boolean` · **Default:** `false`

The documentation of an exported variable or constant should start with variable's name

Doc comments work best as complete sentences, which
allow a wide variety of automated presentations. The first sentence
should be a one-sentence summary that starts with the name being
declared.

If every doc comment begins with the name of the item it describes,
you can use the doc subcommand of the go tool and run the output
through grep.

See https://go.dev/doc/effective_go#commentary for more
information on how to write good documentation.

Available since
    2020.1, non-default

### `ST1023`

**Type:** `boolean` · **Default:** `false`

Redundant type in variable declaration

Available since
    2021.1, non-default

### `any`

**Type:** `boolean` · **Default:** `true`

replace interface&#123;&#125; with any

The any analyzer suggests replacing uses of the empty interface type,
`interface{}`, with the `any` alias, which was introduced in Go 1.18.
This is a purely stylistic change that makes code more readable.

### `appendclipped`

**Type:** `boolean` · **Default:** `false`

simplify append chains using slices.Concat

The appendclipped analyzer suggests replacing chains of append calls with a
single call to slices.Concat, which was added in Go 1.21. For example,
append(append(s, s1...), s2...) would be simplified to slices.Concat(s, s1, s2).

In the simple case of appending to a newly allocated slice, such as
append([]T(nil), s...), the analyzer suggests the more concise slices.Clone(s).
For byte slices, it will prefer bytes.Clone if the "bytes" package is
already imported.

Since the replacement (slices.Concat, or slices.Clone) allocates a new
slice, any slices.Clone or bytes.Clone wrapping one of the operands is
redundant and is removed, e.g. append(append([]T&#123;&#125;, slices.Clone(s)...),
t...) becomes slices.Concat(s, t). The clone of os.Environ in
append([]string(nil), os.Environ()...) is likewise elided.

This fix is only applied when the base of the append tower is a
"clipped" slice, meaning its length and capacity are equal (e.g.
x[:0:0] or []T&#123;&#125;). This is to avoid changing program behavior by
eliminating intended side effects on the base slice's underlying
array.

This analyzer is currently disabled by default as the
transformation does not preserve the nilness of the base slice in
all cases; see https://go.dev/issue/73557.

### `appends`

**Type:** `boolean` · **Default:** `true`

check for missing values after append

This checker reports calls to append that pass
no values to be appended to the slice.

	s := []string{"a", "b", "c"}
	_ = append(s)

Such calls are always no-ops and often indicate an
underlying mistake.

### `asmdecl`

**Type:** `boolean` · **Default:** `true`

report mismatches between assembly files and Go declarations

### `assign`

**Type:** `boolean` · **Default:** `true`

check for useless assignments

This checker reports assignments of the form x = x or a[i] = a[i].
These are almost always useless, and even when they aren't they are
usually a mistake.

### `atomic`

**Type:** `boolean` · **Default:** `true`

check for common mistakes using the sync/atomic package

The atomic checker looks for assignment statements of the form:

	x = atomic.AddUint64(&x, 1)

which are not atomic.

### `atomicalign`

**Type:** `boolean` · **Default:** `true`

check for non-64-bits-aligned arguments to sync/atomic functions

### `atomictypes`

**Type:** `boolean` · **Default:** `true`

replace basic types in sync/atomic calls with atomic types

The atomictypes analyzer suggests replacing the primitive sync/atomic functions with
the strongly typed atomic wrapper types introduced in Go1.19 (e.g.
atomic.Int32). For example,

	var x int32
	atomic.AddInt32(&x, 1)

would become

	var x atomic.Int32
	x.Add(1)

The atomic types are safer because they don't allow non-atomic access, which is
a common source of bugs. These types also resolve memory alignment issues that
plagued the old atomic functions on 32-bit architectures.

### `bloop`

**Type:** `boolean` · **Default:** `true`

replace for-range over b.N with b.Loop

The bloop analyzer suggests replacing benchmark loops of the form
`for i := 0; i < b.N; i++` or `for range b.N` with the more modern
`for b.Loop()`, which was added in Go 1.24.

This change makes benchmark code more readable and also removes the need for
manual timer control, so any preceding calls to b.StartTimer, b.StopTimer,
or b.ResetTimer within the same function will also be removed.

Caveats: The b.Loop() method is designed to prevent the compiler from
optimizing away the benchmark loop, which can occasionally result in
slower execution due to increased allocations in some specific cases.
Since its fix may change the performance of nanosecond-scale benchmarks,
bloop is disabled by default in the `go fix` analyzer suite; see golang/go#74967.

### `bools`

**Type:** `boolean` · **Default:** `true`

check for common mistakes involving boolean operators

### `buildtag`

**Type:** `boolean` · **Default:** `true`

check //go:build and // +build directives

### `cgocall`

**Type:** `boolean` · **Default:** `true`

detect some violations of the cgo pointer passing rules

Check for invalid cgo pointer passing.
This looks for code that uses cgo to call C code passing values
whose types are almost always invalid according to the cgo pointer
sharing rules.
Specifically, it warns about attempts to pass a Go chan, map, func,
or slice to C, either directly, or via a pointer, array, or struct.

### `composites`

**Type:** `boolean` · **Default:** `true`

check for unkeyed composite literals

This analyzer reports a diagnostic for composite literals of struct
types imported from another package that do not use the field-keyed
syntax. Such literals are fragile because the addition of a new field
(even if unexported) to the struct will cause compilation to fail.

As an example,

	err = &net.DNSConfigError{err}

should be replaced by:

	err = &net.DNSConfigError{Err: err}

### `copylocks`

**Type:** `boolean` · **Default:** `true`

check for locks erroneously passed by value

Inadvertently copying a value containing a lock, such as sync.Mutex or
sync.WaitGroup, may cause both copies to malfunction. Generally such
values should be referred to through a pointer.

### `deepequalerrors`

**Type:** `boolean` · **Default:** `true`

check for calls of reflect.DeepEqual on error values

The deepequalerrors checker looks for calls of the form:

    reflect.DeepEqual(err1, err2)

where err1 and err2 are errors. Using reflect.DeepEqual to compare
errors is discouraged.

### `defers`

**Type:** `boolean` · **Default:** `true`

report common mistakes in defer statements

The defers analyzer reports a diagnostic when a defer statement would
result in a non-deferred call to time.Since, as experience has shown
that this is nearly always a mistake.

For example:

	start := time.Now()
	...
	defer recordLatency(time.Since(start)) // error: call to time.Since is not deferred

The correct code is:

	defer func() { recordLatency(time.Since(start)) }()

### `deprecated`

**Type:** `boolean` · **Default:** `true`

check for use of deprecated identifiers

The deprecated analyzer looks for deprecated symbols and package
imports.

See https://go.dev/wiki/Deprecated to learn about Go's convention
for documenting and signaling deprecated identifiers.

### `directive`

**Type:** `boolean` · **Default:** `true`

check Go toolchain directives such as //go:debug

This analyzer checks for problems with known Go toolchain directives
in all Go source files in a package directory, even those excluded by
//go:build constraints, and all non-Go source files too.

For //go:debug (see https://go.dev/doc/godebug), the analyzer checks
that the directives are placed only in Go source files, only above the
package comment, and only in package main or *_test.go files.

Support for other known directives may be added in the future.

This analyzer does not check //go:build, which is handled by the
buildtag analyzer.

### `embed`

**Type:** `boolean` · **Default:** `true`

check //go:embed directive usage

This analyzer checks that the embed package is imported if //go:embed
directives are present, providing a suggested fix to add the import if
it is missing.

This analyzer also checks that //go:embed directives precede the
declaration of a single variable.

### `embedlit`

**Type:** `boolean` · **Default:** `true`

simplify references to embedded fields in composite literals

The embedlit analyzer suggests removing redundant embedded field type specifiers
from composite literals. Go1.27 introduced the ability to directly initialize
fields promoted from embedded struct types without a nested literal. For
example, given the following structs:

	type T struct {
		U
	}

	type U struct {
		x int
	}

A composite literal such as

	t := T{U: U{x: 1}}

would become

	t := T{x: 1}

### `errorsas`

**Type:** `boolean` · **Default:** `true`

report passing non-pointer or non-error values to errors.As

The errorsas analyzer reports calls to errors.As where the type
of the second argument is not a pointer to a type implementing error.
For example:

	var unwrappedErr net.DNSError
	errors.As(err, unwrappedErr) // should use &unwrappedErr, DNSError.Error has a pointer receiver

### `errorsastype`

**Type:** `boolean` · **Default:** `true`

replace errors.As with errors.AsType[T]

This analyzer suggests fixes to simplify uses of [errors.As] of
this form:

	var myerr *MyErr
	if errors.As(err, &myerr) {
		handle(myerr)
	}

by using the less error-prone generic [errors.AsType] function,
introduced in Go 1.26:

	if myerr, ok := errors.AsType[*MyErr](err); ok {
		handle(myerr)
	}

The fix is only offered if the var declaration has the form shown and
there are no uses of myerr outside the if statement.

### `errorsastypeshadow`

**Type:** `boolean` · **Default:** `true`

report shadowing of errors.AsType[T] in if/else chains

For example:

	err := f()
	if err, ok := errors.AsType[*FooErr](err); ok {
	    useFoo(err)
	} else if err, ok := errors.AsType[*BarErr](err); ok {
	    useBar(err)
	}

In this case, the second call to errors.AsType does not operate on the
original error. Instead, its operand is the zero value of type *FooErr
produced by the first if statement; this is invariably a mistake.

### `fieldalignment`

**Type:** `boolean` · **Default:** `false`

find structs that would use less memory if their fields were sorted

This analyzer finds structs that can be rearranged to use less memory, and provides
a suggested edit with the most compact order.

Note that there are two different diagnostics reported. One checks struct size,
and the other reports "pointer bytes" used. Pointer bytes is how many bytes of the
object that the garbage collector has to potentially scan for pointers, for example:

	struct { uint32; string }

have 16 pointer bytes because the garbage collector has to scan up through the string's
inner pointer.

	struct { string; *uint32 }

has 24 pointer bytes because it has to scan further through the *uint32.

	struct { string; uint32 }

has 8 because it can stop immediately after the string pointer.

Be aware that the most compact order is not always the most efficient.
In rare cases it may cause two variables each updated by its own goroutine
to occupy the same CPU cache line, inducing a form of memory contention
known as "false sharing" that slows down both goroutines.

Unlike most analyzers, which report likely mistakes, the diagnostics
produced by fieldanalyzer very rarely indicate a significant problem,
so the analyzer is not included in typical suites such as vet or
gopls. Use this standalone command to run it on your code:

   $ go install golang.org/x/tools/go/analysis/passes/fieldalignment/cmd/fieldalignment@latest
   $ fieldalignment [packages]

### `fillreturns`

**Type:** `boolean` · **Default:** `true`

suggest fixes for errors due to an incorrect number of return values

This checker provides suggested fixes for type errors of the
type "wrong number of return values (want %d, got %d)". For example:

	func m() (int, string, *bool, error) {
		return
	}

will turn into

	func m() (int, string, *bool, error) {
		return 0, "", nil, nil
	}

This functionality is similar to https://github.com/sqs/goreturns.

### `fmtappendf`

**Type:** `boolean` · **Default:** `true`

replace []byte(fmt.Sprintf) with fmt.Appendf

The fmtappendf analyzer suggests replacing `[]byte(fmt.Sprintf(...))` with
`fmt.Appendf(nil, ...)`. This avoids the intermediate allocation of a string
by Sprintf, making the code more efficient. The suggestion also applies to
fmt.Sprint and fmt.Sprintln.

Since its fix is not a Pareto improvement, fmtappendf is disabled by default in
the `go fix` analyzer suite; see golang/go#77581.

### `forvar`

**Type:** `boolean` · **Default:** `true`

remove redundant re-declaration of loop variables

The forvar analyzer removes unnecessary shadowing of loop variables.
Before Go 1.22, it was common to write `for _, x := range s { x := x ... }`
to create a fresh variable for each iteration. Go 1.22 changed the semantics
of `for` loops, making this pattern redundant. This analyzer removes the
unnecessary `x := x` statement.

This fix only applies to `range` loops.

### `framepointer`

**Type:** `boolean` · **Default:** `true`

report assembly that clobbers the frame pointer before saving it

### `hostport`

**Type:** `boolean` · **Default:** `true`

check format of addresses passed to net.Dial

This analyzer flags code that produce network address strings using
fmt.Sprintf, as in this example:

    addr := fmt.Sprintf("%s:%d", host, 12345) // "will not work with IPv6"
    ...
    conn, err := net.Dial("tcp", addr)       // "when passed to dial here"

The analyzer suggests a fix to use the correct approach, a call to
net.JoinHostPort:

    addr := net.JoinHostPort(host, "12345")
    ...
    conn, err := net.Dial("tcp", addr)

A similar diagnostic and fix are produced for a format string of "%s:%s".

### `httpresponse`

**Type:** `boolean` · **Default:** `true`

check for mistakes using HTTP responses

A common mistake when using the net/http package is to defer a function
call to close the http.Response Body before checking the error that
determines whether the response is valid:

	resp, err := http.Head(url)
	defer resp.Body.Close()
	if err != nil {
		log.Fatal(err)
	}
	// (defer statement belongs here)

This checker helps uncover latent nil dereference bugs by reporting a
diagnostic for such mistakes.

### `ifaceassert`

**Type:** `boolean` · **Default:** `true`

detect impossible interface-to-interface type assertions

This checker flags type assertions v.(T) and corresponding type-switch cases
in which the static type V of v is an interface that cannot possibly implement
the target interface T. This occurs when V and T contain methods with the same
name but different signatures. Example:

	var v interface {
		Read()
	}
	_ = v.(io.Reader)

The Read method in v has a different signature than the Read method in
io.Reader, so this assertion cannot succeed.

### `importcomment`

**Type:** `boolean` · **Default:** `true`

remove obsolete comments specifying canonical import path

The importcomment analyzer removes comments specifying the canonical
import path, such as

	package foo // import "example.com/foo"

The go command enforced these comments in GOPATH mode via "go get", but
ignores them in module mode, so they are obsolete once the package
belongs to a module. The fix removes the comment.

### `infertypeargs`

**Type:** `boolean` · **Default:** `true`

check for unnecessary type arguments in call expressions

Explicit type arguments may be omitted from call expressions if they can be
inferred from function arguments, or from other type arguments:

	func f[T any](T) {}
	
	func _() {
		f[string]("foo") // string could be inferred
	}

### `inline`

**Type:** `boolean` · **Default:** `true`

apply fixes based on 'go:fix inline' comment directives

The inline analyzer inlines functions, constants, and type aliases
that are marked for inlining.

Use this command to apply (just) inline fixes en masse:

	$ go fix -inline ./...

## Functions

Given a function that is marked for inlining, like this one:

	//go:fix inline
	func Square(x int) int { return Pow(x, 2) }

this analyzer will recommend that calls to the function elsewhere, in the same
or other packages, should be inlined.

Inlining can be used to move off of a deprecated function:

	// Deprecated: prefer Pow(x, 2).
	//go:fix inline
	func Square(x int) int { return Pow(x, 2) }

It can also be used to move off of an obsolete package,
as when the import path has changed or a higher major version is available:

	package pkg

	import pkg2 "pkg/v2"

	//go:fix inline
	func F() { pkg2.F(nil) }

Replacing a call pkg.F() by pkg2.F(nil) can have no effect on the program,
so this mechanism provides a low-risk way to update large numbers of calls.
We recommend, where possible, expressing the old API in terms of the new one
to enable automatic migration.

The inliner takes care to avoid behavior changes, even subtle ones,
such as changes to the order in which argument expressions are
evaluated. When it cannot safely eliminate all parameter variables,
it may introduce a "binding declaration" of the form

	var params = args

to evaluate argument expressions in the correct order and bind them to
parameter variables. Since the resulting code transformation may be
stylistically suboptimal, such inlinings may be disabled by specifying
the -inline.allow_binding_decl=false flag to the analyzer driver.

(In cases where it is not safe to "reduce" a call—that is, to replace
a call f(x) by the body of function f, suitably substituted—the
inliner machinery is capable of replacing f by a function literal,
func()&#123;...&#125;(). However, the inline analyzer discards all such
"literalizations" unconditionally, again on grounds of style.)

## Constants

Given a constant that is marked for inlining, like this one:

	//go:fix inline
	const Ptr = Pointer

this analyzer will recommend that uses of Ptr should be replaced with Pointer.

As with functions, inlining can be used to replace deprecated constants and
constants in obsolete packages.

A constant definition can be marked for inlining only if it refers to another
named constant.

The "//go:fix inline" comment must appear before a single const declaration on its own,
as above; before a const declaration that is part of a group, as in this case:

	const (
	   C = 1
	   //go:fix inline
	   Ptr = Pointer
	)

or before a group, applying to every constant in the group:

	//go:fix inline
	const (
		Ptr = Pointer
		Val = Value
	)

## Type aliases

Similar to named constants, a type alias can also be marked for inlining:

	//go:fix inline
	type A = newpkg.A

The analyzer will replace all references to the annotated type
(A) by the type on the right-hand side of the declaration (newpkg.A).

## Tests

A use of a function, named constant, or type alias X from its
dedicated test (TestX), is not inlined, since the purpose of the test
is to exercise X itself, even if it is deprecated and other uses of it
should be inlined.
This applies to benchmarks and examples too, and follows the usual
conventions of test function naming.

Similarly, if the symbol X is declared in a file named foo.go, any use
of it within a file named foo_test.go will also not be inlined.

### `loopclosure`

**Type:** `boolean` · **Default:** `true`

check references to loop variables from within nested functions

This analyzer reports places where a function literal references the
iteration variable of an enclosing loop, and the loop calls the function
in such a way (e.g. with go or defer) that it may outlive the loop
iteration and possibly observe the wrong value of the variable.

Note: An iteration variable can only outlive a loop iteration in Go versions &lt;=1.21.
In Go 1.22 and later, the loop variable lifetimes changed to create a new
iteration variable per loop iteration. (See go.dev/issue/60078.)

In this example, all the deferred functions run after the loop has
completed, so all observe the final value of v [&lt;go1.22].

	for _, v := range list {
	    defer func() {
	        use(v) // incorrect
	    }()
	}

One fix is to create a new variable for each iteration of the loop:

	for _, v := range list {
	    v := v // new var per iteration
	    defer func() {
	        use(v) // ok
	    }()
	}

After Go version 1.22, the previous two for loops are equivalent
and both are correct.

The next example uses a go statement and has a similar problem [&lt;go1.22].
In addition, it has a data race because the loop updates v
concurrent with the goroutines accessing it.

	for _, v := range elem {
	    go func() {
	        use(v)  // incorrect, and a data race
	    }()
	}

A fix is the same as before. The checker also reports problems
in goroutines started by golang.org/x/sync/errgroup.Group.
A hard-to-spot variant of this form is common in parallel tests:

	func Test(t *testing.T) {
	    for _, test := range tests {
	        t.Run(test.name, func(t *testing.T) {
	            t.Parallel()
	            use(test) // incorrect, and a data race
	        })
	    }
	}

The t.Parallel() call causes the rest of the function to execute
concurrent with the loop [&lt;go1.22].

The analyzer reports references only in the last statement,
as it is not deep enough to understand the effects of subsequent
statements that might render the reference benign.
("Last statement" is defined recursively in compound
statements such as if, switch, and select.)

See: https://golang.org/doc/go_faq.html#closures_and_goroutines

### `lostcancel`

**Type:** `boolean` · **Default:** `true`

check cancel func returned by context.WithCancel is called

The cancellation function returned by context.WithCancel, WithTimeout,
WithDeadline and variants such as WithCancelCause must be called,
or the new context will remain live until its parent context is cancelled.
(The background context is never cancelled.)

### `maprange`

**Type:** `boolean` · **Default:** `true`

checks for unnecessary calls to maps.Keys and maps.Values in range statements

Consider a loop written like this:

	for val := range maps.Values(m) {
		fmt.Println(val)
	}

This should instead be written without the call to maps.Values:

	for _, val := range m {
		fmt.Println(val)
	}

golang.org/x/exp/maps returns slices for Keys/Values instead of iterators,
but unnecessary calls should similarly be removed:

	for _, key := range maps.Keys(m) {
		fmt.Println(key)
	}

should be rewritten as:

	for key := range m {
		fmt.Println(key)
	}

### `mapsloop`

**Type:** `boolean` · **Default:** `true`

replace explicit loops over maps with calls to maps package

The mapsloop analyzer replaces loops of the form

	for k, v := range x { m[k] = v }

with a single call to a function from the `maps` package, added in Go 1.23.
Depending on the context, this could be `maps.Copy`, `maps.Insert`,
`maps.Clone`, or `maps.Collect`.

The transformation to `maps.Clone` is applied conservatively, as it
preserves the nilness of the source map, which may be a subtle change in
behavior if the original code did not handle a nil map in the same way.

### `minmax`

**Type:** `boolean` · **Default:** `true`

replace if/else statements with calls to min or max

The minmax analyzer simplifies conditional assignments by suggesting the use
of the built-in `min` and `max` functions, introduced in Go 1.21. For example,

	if a < b { x = a } else { x = b }

is replaced by

	x = min(a, b).

This analyzer avoids making suggestions for floating-point types,
as the behavior of `min` and `max` with NaN values can differ from
the original if/else statement.

### `newexpr`

**Type:** `boolean` · **Default:** `true`

simplify code by using go1.26's new(expr)

This analyzer finds declarations of functions of this form:

	func varOf(x int) *int { return &x }

and suggests a fix to turn them into inlinable wrappers around
go1.26's built-in new(expr) function:

	//go:fix inline
	func varOf(x int) *int { return new(x) }

(The directive comment causes the 'inline' analyzer to suggest
that calls to such functions are inlined.)

In addition, this analyzer suggests a fix for each call
to one of the functions before it is transformed, so that

	use(varOf(123))

is replaced by:

	use(new(123))

Wrapper functions such as varOf are common when working with Go
serialization packages such as for JSON or protobuf, where pointers
are often used to express optionality.

### `nilfunc`

**Type:** `boolean` · **Default:** `true`

check for useless comparisons between functions and nil

A useless comparison is one like f == nil as opposed to f() == nil.

### `nilness`

**Type:** `boolean` · **Default:** `true`

check for redundant or impossible nil comparisons

The nilness checker inspects the control-flow graph of each function in
a package and reports nil pointer dereferences, degenerate nil
pointers, and panics with nil values. A degenerate comparison is of the form
x==nil or x!=nil where x is statically known to be nil or non-nil. These are
often a mistake, especially in control flow related to errors. Panics with nil
values are checked because they are not detectable by

	if r := recover(); r != nil {

This check reports conditions such as:

	if f == nil { // impossible condition (f is a function)
	}

and:

	p := &v
	...
	if p != nil { // tautological condition
	}

and:

	if p == nil {
		print(*p) // nil dereference
	}

and:

	if p == nil {
		panic(p)
	}

Sometimes the control flow may be quite complex, making bugs hard
to spot. In the example below, the err.Error expression is
guaranteed to panic because, after the first return, err must be
nil. The intervening loop is just a distraction.

	...
	err := g.Wait()
	if err != nil {
		return err
	}
	partialSuccess := false
	for _, err := range errs {
		if err == nil {
			partialSuccess = true
			break
		}
	}
	if partialSuccess {
		reportStatus(StatusMessage{
			Code:   code.ERROR,
			Detail: err.Error(), // "nil dereference in dynamic method call"
		})
		return nil
	}

...

### `nonewvars`

**Type:** `boolean` · **Default:** `true`

suggested fixes for "no new vars on left side of :="

This checker provides suggested fixes for type errors of the
type "no new vars on left side of :=". For example:

	z := 1
	z := 2

will turn into

	z := 1
	z = 2

### `noresultvalues`

**Type:** `boolean` · **Default:** `true`

suggested fixes for unexpected return values

This checker provides suggested fixes for type errors of the
type "no result values expected" or "too many return values".
For example:

	func z() { return nil }

will turn into

	func z() { return }

### `omitzero`

**Type:** `boolean` · **Default:** `true`

suggest replacing omitempty with omitzero for struct fields

The omitzero analyzer identifies uses of the `omitempty` JSON struct
tag on fields that are themselves structs. For struct-typed fields,
the `omitempty` tag has no effect on the behavior of json.Marshal and
json.Unmarshal. The analyzer offers two suggestions: either remove the
tag, or replace it with `omitzero` (added in Go 1.24), which correctly
omits the field if the struct value is zero.

However, some other serialization packages (notably kubebuilder, see
https://book.kubebuilder.io/reference/markers.html) may have their own
interpretation of the `json:",omitzero"` tag, so removing it may affect
program behavior. For this reason, the omitzero modernizer will not
make changes in any package that contains +kubebuilder annotations.

Replacing `omitempty` with `omitzero` is a change in behavior. The
original code would always encode the struct field, whereas the
modified code will omit it if it is a zero-value.

### `plusbuild`

**Type:** `boolean` · **Default:** `true`

remove obsolete //+build comments

The plusbuild analyzer suggests a fix to remove obsolete build tags
of the form:

	//+build linux,amd64

in files that also contain a Go 1.18-style tag such as:

	//go:build linux && amd64

(It does not check that the old and new tags are consistent;
that is the job of the 'buildtag' analyzer in the vet suite.)

### `printf`

**Type:** `boolean` · **Default:** `true`

check consistency of Printf format strings and arguments

The check applies to calls of the formatting functions such as
[fmt.Printf] and [fmt.Sprintf], as well as any detected wrappers of
those functions such as [log.Printf]. It reports a variety of
mistakes such as syntax errors in the format string and mismatches
(of number and type) between the verbs and their arguments.

See the documentation of the fmt package for the complete set of
format operators and their operand types.

### `ptrtoerror`

**Type:** `boolean` · **Default:** `true`

detect inconsistent conversions of concrete types to error

The ptrtoerror analyzer detects when a concrete type E is converted
to the error interface inconsistently, both as a value of type E
and as a pointer of type *E. Such inconsistency defeats attempts by
client code to test for specific error types using type assertions
or library functions such as [errors.As] and [errors.Is].

The analyzer also detects when both E and *E implement error but
neither of those types is converted to error within the defining
package, leaving the intended error form (E or *E) ambiguous. This
diagnostic offers two alternative fixes to add declarations that
make the intent explicit.

### `rangeint`

**Type:** `boolean` · **Default:** `true`

replace 3-clause for loops with for-range over integers

The rangeint analyzer suggests replacing traditional for loops such
as

	for i := 0; i < n; i++ { ... }

with the more idiomatic Go 1.22 style:

	for i := range n { ... }

This transformation is applied only if (a) the loop variable is not
modified within the loop body and (b) the loop's limit expression
is not modified within the loop, as `for range` evaluates its
operand only once.

### `recursiveiter`

**Type:** `boolean` · **Default:** `true`

check for inefficient recursive iterators

This analyzer reports when a function that returns an iterator
(iter.Seq or iter.Seq2) calls itself as the operand of a range
statement, as this is inefficient.

When implementing an iterator (e.g. iter.Seq[T]) for a recursive
data type such as a tree or linked list, it is tempting to
recursively range over the iterator for each child element.

Here's an example of a naive iterator over a binary tree:

	type tree struct {
		value       int
		left, right *tree
	}

	func (t *tree) All() iter.Seq[int] {
		return func(yield func(int) bool) {
			if t != nil {
				for elem := range t.left.All() { // "inefficient recursive iterator"
					if !yield(elem) {
						return
					}
				}
				if !yield(t.value) {
					return
				}
				for elem := range t.right.All() { // "inefficient recursive iterator"
					if !yield(elem) {
						return
					}
				}
			}
		}
	}

Though it correctly enumerates the elements of the tree, it hides a
significant performance problem--two, in fact. Consider a balanced
tree of N nodes. Iterating the root node will cause All to be
called once on every node of the tree. This results in a chain of
nested active range-over-func statements when yield(t.value) is
called on a leaf node.

The first performance problem is that each range-over-func
statement must typically heap-allocate a variable, so iteration of
the tree allocates as many variables as there are elements in the
tree, for a total of O(N) allocations, all unnecessary.

The second problem is that each call to yield for a leaf of the
tree causes each of the enclosing range loops to receive a value,
which they then immediately pass on to their respective yield
function. This results in a chain of log(N) dynamic yield calls per
element, a total of O(N*log N) dynamic calls overall, when only
O(N) are necessary.

A better implementation strategy for recursive iterators is to
first define the "every" operator for your recursive data type,
where every(f) reports whether an arbitrary predicate f(x) is true
for every element x in the data type. For our tree, the every
function would be:

	func (t *tree) every(f func(int) bool) bool {
		return t == nil ||
			t.left.every(f) && f(t.value) && t.right.every(f)
	}

For example, this use of the every operator prints whether every
element in the tree is an even number:

	even := func(x int) bool { return x&1 == 0 }
	println(t.every(even))

Then the iterator can be simply expressed as a trivial wrapper
around the every operator:

	func (t *tree) All() iter.Seq[int] {
		return func(yield func(int) bool) {
			_ = t.every(yield)
		}
	}

In effect, tree.All computes whether yield returns true for each
element, short-circuiting if it ever returns false, then discards
the final boolean result.

This has much better performance characteristics: it makes one
dynamic call per element of the tree, and it doesn't heap-allocate
anything. It is also clearer.

### `reflecttypeassert`

**Type:** `boolean` · **Default:** `true`

replace v.Interface().(T) with reflect.TypeAssert[T](v)

This analyzer suggests fixes to replace two-valued type assertions on
the result of (reflect.Value).Interface with reflect.TypeAssert,
introduced in go1.25, which avoids the intermediate allocation of an
interface value, for example:

	x, ok := v.Interface().(string)  ->  x, ok := reflect.TypeAssert[string](v)

No fix is offered for single-valued assertions, since they panic when
the assertion fails whereas reflect.TypeAssert does not. Nor is a fix
offered for a type switch.

### `reflecttypefor`

**Type:** `boolean` · **Default:** `true`

replace reflect.TypeOf(x) with TypeFor[T]()

This analyzer suggests fixes to replace uses of reflect.TypeOf(x) with
reflect.TypeFor, introduced in go1.22, when the desired runtime type
is known at compile time, for example:

	reflect.TypeOf(uint32(0))        -> reflect.TypeFor[uint32]()
	reflect.TypeOf((*ast.File)(nil)) -> reflect.TypeFor[*ast.File]()

It also offers a fix to simplify the constructions below, which use
reflect.TypeOf to return the runtime type for an interface type,

	reflect.TypeOf((*io.Reader)(nil)).Elem()

or:

	reflect.TypeOf([]io.Reader(nil)).Elem()

to:

	reflect.TypeFor[io.Reader]()

No fix is offered in cases when the runtime type is dynamic, such as:

	var r io.Reader = ...
	reflect.TypeOf(r)

or when the operand has potential side effects.

### `scannererr`

**Type:** `boolean` · **Default:** `true`

scannererr: report failure to check bufio.Scanner.Err

This analyzer reports uses of bufio.Scanner in which the result of
NewScanner is assigned to a local variable that is then used in a loop
that calls Scanner.Scan, but lacks a final check of Scanner.Err,
which is how I/O errors are reported.

For example:

	sc := bufio.NewScanner(os.Stdin) // error: "bufio.Scanner sc is used in Scan loop without final check of sc.Err()"
	for sc.Scan() {
		line := sc.Text()
		use(line)
	}
	/* ...no use of sc.Err()... */

To avoid false positives, the analyzer is silent if the scanner is
passed into or out of the function or assigned somewhere other than a
local variable.

It is not this analyzer's goal to ensure proper handling of errors in
all cases, but merely the simple mistakes where the user may have been
oblivious to the existence of the Scanner.Err method.

The analyzer ignores calls to bufio.NewScanner whose argument is an
infallible memory-backed io.Reader such as strings.Reader or bytes.Buffer.
(In such cases, Scan may yet fail if a token or line is too long for the
scanner's internal buffer, but this is rare.)

If you know that errors are impossible for a given scanner, you can
suppress the diagnostic thus:

	_ = sc.Err() // ignore error; neither reading nor scanning can fail

### `shadow`

**Type:** `boolean` · **Default:** `false`

check for possible unintended shadowing of variables

This analyzer check for shadowed variables.
A shadowed variable is a variable declared in an inner scope
with the same name and type as a variable in an outer scope,
and where the outer variable is mentioned after the inner one
is declared.

(This definition can be refined; the module generates too many
false positives and is not yet enabled by default.)

For example:

	func BadRead(f *os.File, buf []byte) error {
		var err error
		for {
			n, err := f.Read(buf) // shadows the function variable 'err'
			if err != nil {
				break // causes return of wrong value
			}
			foo(buf)
		}
		return err
	}

### `shift`

**Type:** `boolean` · **Default:** `true`

check for shifts that equal or exceed the width of the integer

### `sigchanyzer`

**Type:** `boolean` · **Default:** `true`

check for unbuffered channel of os.Signal

This checker reports call expression of the form

	signal.Notify(c <-chan os.Signal, sig ...os.Signal),

where c is an unbuffered channel, which can be at risk of missing the signal.

### `simplifycompositelit`

**Type:** `boolean` · **Default:** `true`

check for composite literal simplifications

An array, slice, or map composite literal of the form:

	[]T{T{}, T{}}

will be simplified to:

	[]T{{}, {}}

This is one of the simplifications that "gofmt -s" applies.

This analyzer ignores generated code.

### `simplifyrange`

**Type:** `boolean` · **Default:** `true`

check for range statement simplifications

A range of the form:

	for x, _ = range v {...}

will be simplified to:

	for x = range v {...}

A range of the form:

	for _ = range v {...}

will be simplified to:

	for range v {...}

This is one of the simplifications that "gofmt -s" applies.

This analyzer ignores generated code.

### `simplifyslice`

**Type:** `boolean` · **Default:** `true`

check for slice simplifications

A slice expression of the form:

	s[a:len(s)]

will be simplified to:

	s[a:]

This is one of the simplifications that "gofmt -s" applies.

This analyzer ignores generated code.

### `slicesbackward`

**Type:** `boolean` · **Default:** `true`

replace backward loops over slices with slices.Backward

The slicesbackward analyzer suggests replacing manually-written backward
loops of the form

	for i := len(s) - 1; i >= 0; i-- {
	    use(s[i])
	}

with the more readable Go 1.23 style using slices.Backward:

	for _, v := range slices.Backward(s) {
	    use(v)
	}

If the loop index is needed beyond just indexing into the slice, both
the index and value variables are kept:

	for i, v := range slices.Backward(s) { ... }

### `slicesclip`

**Type:** `boolean` · **Default:** `true`

replace three-index slice expressions with slices.Clip

The slicesclip analyzer suggests replacing a full slice expression of
the form

	x[:len(x):len(x)]

which clips the capacity of a slice to its length, with the simpler
and more readable

	slices.Clip(x)

added in Go 1.21.

### `slicescontains`

**Type:** `boolean` · **Default:** `true`

replace loops with slices.Contains or slices.ContainsFunc

The slicescontains analyzer simplifies loops that check for the existence of
an element in a slice. It replaces them with calls to `slices.Contains` or
`slices.ContainsFunc`, which were added in Go 1.21.

If the expression for the target element has side effects, this
transformation will cause those effects to occur only once, not
once per tested slice element.

### `slicesdelete`

**Type:** `boolean` · **Default:** `false`

replace append-based slice deletion with slices.Delete

The slicesdelete analyzer suggests replacing the idiom

	s = append(s[:i], s[j:]...)

with the more explicit

	s = slices.Delete(s, i, j)

introduced in Go 1.21.

This analyzer is disabled by default. The `slices.Delete` function
zeros the elements between the new length and the old length of the
slice to prevent memory leaks, which is a subtle difference in
behavior compared to the append-based idiom; see https://go.dev/issue/73686.

### `slicessort`

**Type:** `boolean` · **Default:** `true`

replace sort.Slice with slices.Sort for basic types

The slicessort analyzer simplifies sorting slices of basic ordered
types. It replaces

	sort.Slice(s, func(i, j int) bool { return s[i] < s[j] })

with the simpler `slices.Sort(s)`, which was added in Go 1.21.

### `slog`

**Type:** `boolean` · **Default:** `true`

check for invalid structured logging calls

The slog checker looks for calls to functions from the log/slog
package that take alternating key-value pairs. It reports calls
where an argument in a key position is neither a string nor a
slog.Attr, and where a final key is missing its value.
For example,it would report

	slog.Warn("message", 11, "k") // slog.Warn arg "11" should be a string or a slog.Attr

and

	slog.Info("message", "k1", v1, "k2") // call to slog.Info missing a final value

### `sortslice`

**Type:** `boolean` · **Default:** `true`

check the argument type of sort.Slice

sort.Slice requires an argument of a slice type. Check that
the interface&#123;&#125; value passed to sort.Slice is actually a slice.

### `sqlrowserr`

**Type:** `boolean` · **Default:** `true`

sqlrowserr: report failure to check sql.Rows.Err

This analyzer reports uses of sql.Rows in which the result of a query
such as db.Query() is assigned to a local variable that is then used
in a loop that calls Rows.Next, but lacks a final check of Rows.Err.
This causes row iteration errors to be discarded.

For example:

	rows, err := db.Query("select ...") // error: "sql.Rows rows is used in Next loop without final check of rows.Err()"
	if err != nil {
		return err
	}
	defer rows.Close() // ignore error
	for rows.Next() {
		var x int
		if err := rows.Scan(&x); err != nil {
			return err
		}
		use(x)
	}
	/* ...no use of rows.Err()... */

Correct usage of sql.Rows demands both a call to Rows.Close to release
resources and a call to Rows.Err to report iteration errors. It is
not critical to report resource cleanup errors, but it is crucial to
report iteration errors as they would otherwise be indistinguishable
from a smaller result.

To avoid false positives, the analyzer is silent if the Rows is passed
into or out of the function or assigned somewhere other than a local
variable.

It is not this analyzer's goal to ensure proper handling of errors in
all cases, but merely the simple mistakes where the user may have been
oblivious to the existence of the Rows.Err method.

### `stditerators`

**Type:** `boolean` · **Default:** `true`

use iterators instead of Len/At-style APIs

This analyzer suggests a fix to replace each loop of the form:

	for i := 0; i < x.Len(); i++ {
		use(x.At(i))
	}

or its "for elem := range x.Len()" equivalent by a range loop over an
iterator offered by the same data type:

	for elem := range x.All() {
		use(elem)
	}

where x is one of various well-known types in the standard library.

### `stdmethods`

**Type:** `boolean` · **Default:** `true`

check signature of methods of well-known interfaces

Sometimes a type may be intended to satisfy an interface but may fail to
do so because of a mistake in its method signature.
For example, the result of this WriteTo method should be (int64, error),
not error, to satisfy io.WriterTo:

	type myWriterTo struct{...}
	func (myWriterTo) WriteTo(w io.Writer) error { ... }

This check ensures that each method whose name matches one of several
well-known interface methods from the standard library has the correct
signature for that interface.

Checked method names include:

	Format GobEncode GobDecode MarshalJSON MarshalXML
	Peek ReadByte ReadFrom ReadRune Scan Seek
	UnmarshalJSON UnreadByte UnreadRune WriteByte
	WriteTo

### `stdversion`

**Type:** `boolean` · **Default:** `true`

report uses of too-new standard library symbols

The stdversion analyzer reports references to symbols in the standard
library that were introduced by a Go release higher than the one in
force in the referring file. (Recall that the file's Go version is
defined by the 'go' directive its module's go.mod file, or by a
"//go:build go1.X" build tag at the top of the file.)

The analyzer does not report a diagnostic for a reference to a "too
new" field or method of a type that is itself "too new", as this may
have false positives, for example if fields or methods are accessed
through a type alias that is guarded by a Go version constraint.

### `stringintconv`

**Type:** `boolean` · **Default:** `true`

check for string(int) conversions

This checker flags conversions of the form string(x) where x is an integer
(but not byte or rune) type. Such conversions are discouraged because they
return the UTF-8 representation of the Unicode code point x, and not a decimal
string representation of x as one might expect. Furthermore, if x denotes an
invalid code point, the conversion cannot be statically rejected.

For conversions that intend on using the code point, consider replacing them
with string(rune(x)). Otherwise, strconv.Itoa and its equivalents return the
string representation of the value in the desired base.

### `stringsbuilder`

**Type:** `boolean` · **Default:** `true`

replace += with strings.Builder

This analyzer replaces repeated string += string concatenation
operations with calls to Go 1.10's strings.Builder.

For example:

	var s = "["
	for x := range seq {
		s += x
		s += "."
	}
	s += "]"
	use(s)

is replaced by:

	var s strings.Builder
	s.WriteString("[")
	for x := range seq {
		s.WriteString(x)
		s.WriteString(".")
	}
	s.WriteString("]")
	use(s.String())

This avoids quadratic memory allocation and improves performance.

No diagnostics are issued in tests, where data sizes are often
small and asymptotic performance is not a security concern.

The analyzer requires that all references to s before the final uses
are += operations. To avoid warning about trivial cases, at least one
must appear within a loop. The variable s must be a local
variable, not a global or parameter.

All uses of the finished string must come after the last += operation.
Each such use will be replaced by a call to strings.Builder's String method.
(These may appear within an intervening loop or function literal, since even
if s.String() is called repeatedly, it does not allocate memory.)

Often the addend is a call to fmt.Sprintf, as in this example:

	var s string
	for x := range seq {
		s += fmt.Sprintf("%v", x)
	}

which, once the suggested fix is applied, becomes:

	var s strings.Builder
	for x := range seq {
		s.WriteString(fmt.Sprintf("%v", x))
	}

The WriteString call can be further simplified to the more efficient
fmt.Fprintf(&s, "%v", x), avoiding the allocation of an intermediary.
However, stringsbuilder does not perform this simplification;
it requires staticcheck analyzer QF1012. (See https://go.dev/issue/76918.)

### `stringscut`

**Type:** `boolean` · **Default:** `true`

replace strings.Index etc. with strings.Cut

This analyzer replaces certain patterns of use of [strings.Index] and string slicing by [strings.Cut], added in go1.18.
It also replaces analogous uses of [strings.LastIndex] by [strings.CutLast], added in go1.27.

For example:

	idx := strings.Index(s, substr)
	if idx >= 0 {
	    return s[:idx]
	}

is replaced by:

	before, _, ok := strings.Cut(s, substr)
	if ok {
	    return before
	}

And:

	idx := strings.LastIndex(s, substr)
	if idx >= 0 {
	    return s[:idx]
	}

is replaced by:

	before, _, ok := strings.CutLast(s, substr)
	if ok {
	    return before
	}

And:

	idx := strings.Index(s, substr)
	if idx >= 0 {
	    return
	}

is replaced by:

	found := strings.Contains(s, substr)
	if found {
	    return
	}

(LastIndex used only as a presence check is also rewritten to Contains.)

It also handles variants using [strings.IndexByte] or [strings.LastIndexByte]
instead of Index/LastIndex, or the bytes package instead of strings.

Fixes are offered only in cases in which there are no potential modifications of the idx, s, or substr expressions between their definition and use.
CutLast fixes are offered only when the file's Go version is at least 1.27.

It also replaces [strings.SplitN](s, sep, 2)[0] and [strings.Split](s, sep)[0] with the "before" result of strings.Cut, when sep is a non-empty string constant:

	x := strings.SplitN(s, sep, 2)[0]

is replaced by:

	x, _, _ := strings.Cut(s, sep)

The fix is only offered when sep is a non-empty string literal. When sep is a variable or the empty string, the semantics differ (strings.Split(s, "")[0] returns the first character of s, but strings.Cut(s, "").before is ""), so no fix is suggested.

### `stringscutprefix`

**Type:** `boolean` · **Default:** `true`

replace HasPrefix/TrimPrefix with CutPrefix

The stringscutprefix analyzer simplifies a common pattern where code first
checks for a prefix with `strings.HasPrefix` and then removes it with
`strings.TrimPrefix`. It replaces this two-step process with a single call
to `strings.CutPrefix`, introduced in Go 1.20. The analyzer also handles
the equivalent functions in the `bytes` package.

For example, this input:

	if strings.HasPrefix(s, prefix) {
	    use(strings.TrimPrefix(s, prefix))
	}

is fixed to:

	if after, ok := strings.CutPrefix(s, prefix); ok {
	    use(after)
	}

The analyzer also offers fixes to use CutSuffix in a similar way.
This input:

	if strings.HasSuffix(s, suffix) {
	    use(strings.TrimSuffix(s, suffix))
	}

is fixed to:

	if before, ok := strings.CutSuffix(s, suffix); ok {
	    use(before)
	}

### `stringsseq`

**Type:** `boolean` · **Default:** `true`

replace ranging over Split/Fields with SplitSeq/FieldsSeq

The stringsseq analyzer improves the efficiency of iterating over substrings.
It replaces

	for range strings.Split(...)

with the more efficient

	for range strings.SplitSeq(...)

which was added in Go 1.24 and avoids allocating a slice for the
substrings. The analyzer also handles strings.Fields and the
equivalent functions in the bytes package.

### `structtag`

**Type:** `boolean` · **Default:** `true`

check that struct field tags conform to reflect.StructTag.Get

Also report certain struct tags (json, xml) used with unexported fields.

### `testingcontext`

**Type:** `boolean` · **Default:** `true`

replace context.WithCancel with t.Context in tests

The testingcontext analyzer simplifies context management in tests. It
replaces the manual creation of a cancellable context,

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

with a single call to t.Context(), which was added in Go 1.24.

This change is only suggested if the `cancel` function is not used
for any other purpose.

### `testinggoroutine`

**Type:** `boolean` · **Default:** `true`

report calls to (*testing.T).Fatal from goroutines started by a test

Functions that abruptly terminate a test, such as the Fatal, Fatalf, FailNow, and
Skip&#123;,f,Now&#125; methods of *testing.T, must be called from the test goroutine itself.
This checker detects calls to these functions that occur within a goroutine
started by the test. For example:

	func TestFoo(t *testing.T) {
	    go func() {
	        t.Fatal("oops") // error: (*T).Fatal called from non-test goroutine
	    }()
	}

### `tests`

**Type:** `boolean` · **Default:** `true`

check for common mistaken usages of tests and examples

The tests checker walks Test, Benchmark, Fuzzing and Example functions checking
malformed names, wrong signatures and examples documenting non-existent
identifiers.

Please see the documentation for package testing in golang.org/pkg/testing
for the conventions that are enforced for Tests, Benchmarks, and Examples.

### `timeformat`

**Type:** `boolean` · **Default:** `true`

check for calls of (time.Time).Format or time.Parse with 2006-02-01

The timeformat checker looks for time formats with the 2006-02-01 (yyyy-dd-mm)
format. Internationally, "yyyy-dd-mm" does not occur in common calendar date
standards, and so it is more likely that 2006-01-02 (yyyy-mm-dd) was intended.

### `unmarshal`

**Type:** `boolean` · **Default:** `true`

report passing non-pointer or non-interface values to unmarshal

The unmarshal analysis reports calls to functions such as json.Unmarshal
in which the argument type is not a pointer or an interface.

### `unreachable`

**Type:** `boolean` · **Default:** `true`

check for unreachable code

The unreachable analyzer finds statements that execution can never reach
because they are preceded by a return statement, a call to panic, an
infinite loop, or similar constructs.

### `unsafefuncs`

**Type:** `boolean` · **Default:** `true`

replace unsafe pointer arithmetic with function calls

The unsafefuncs analyzer simplifies pointer arithmetic expressions by
replacing them with calls to helper functions such as unsafe.Add,
added in Go 1.17.

Example:

	unsafe.Pointer(uintptr(ptr) + uintptr(n))

where ptr is an unsafe.Pointer, is replaced by:

	unsafe.Add(ptr, n)

### `unsafeptr`

**Type:** `boolean` · **Default:** `true`

check for invalid conversions of uintptr to unsafe.Pointer

The unsafeptr analyzer reports likely incorrect uses of unsafe.Pointer
to convert integers to pointers. A conversion from uintptr to
unsafe.Pointer is invalid if it implies that there is a uintptr-typed
word in memory that holds a pointer value, because that word will be
invisible to stack copying and to the garbage collector.

### `unusedfunc`

**Type:** `boolean` · **Default:** `true`

check for unused functions, methods, etc

The unusedfunc analyzer reports functions and methods that are
never referenced outside of their own declaration.

A function is considered unused if it is unexported and not
referenced (except within its own declaration).

A method is considered unused if it is unexported, not referenced
(except within its own declaration), and its name does not match
that of any method of an interface type declared within the same
package.

The tool may report false positives in some situations, for
example:

  - for a declaration of an unexported function that is referenced
    from another package using the go:linkname mechanism, if the
    declaration's doc comment does not also have a go:linkname
    comment.

    (Such code is in any case strongly discouraged: linkname
    annotations, if they must be used at all, should be used on both
    the declaration and the alias.)

  - for compiler intrinsics in the "runtime" package that, though
    never referenced, are known to the compiler and are called
    indirectly by compiled object code.

  - for functions called only from assembly.

  - for functions called only from files whose build tags are not
    selected in the current build configuration.

Since these situations are relatively common in the low-level parts
of the runtime, this analyzer ignores the standard library.
See https://go.dev/issue/71686 and https://go.dev/issue/74130 for
further discussion of these limitations.

The unusedfunc algorithm is not as precise as the
golang.org/x/tools/cmd/deadcode tool, but it has the advantage that
it runs within the modular analysis framework, enabling near
real-time feedback within gopls.

The unusedfunc analyzer also reports unused types, vars, and
constants. Enums--constants defined with iota--are ignored since
even the unused values must remain present to preserve the logical
ordering.

### `unusedparams`

**Type:** `boolean` · **Default:** `true`

check for unused parameters of functions

The unusedparams analyzer checks functions to see if there are
any parameters that are not being used.

To ensure soundness, it ignores:
  - "address-taken" functions, that is, functions that are used as
    a value rather than being called directly; their signatures may
    be required to conform to a func type.
  - exported functions or methods, since they may be address-taken
    in another package.
  - unexported methods whose name matches an interface method
    declared in the same package, since the method's signature
    may be required to conform to the interface type.
  - functions with empty bodies, or containing just a call to panic.
  - parameters that are unnamed, or named "_", the blank identifier.

The analyzer suggests a fix of replacing the parameter name by "_",
but in such cases a deeper fix can be obtained by invoking the
"Refactor: remove unused parameter" code action, which will
eliminate the parameter entirely, along with all corresponding
arguments at call sites, while taking care to preserve any side
effects in the argument expressions; see
https://github.com/golang/tools/releases/tag/gopls%2Fv0.14.

This analyzer ignores generated code.

### `unusedresult`

**Type:** `boolean` · **Default:** `true`

check for unused results of calls to some functions

Some functions like fmt.Errorf return a result and have no side
effects, so it is always a mistake to discard the result. Other
functions may return an error that must not be ignored, or a cleanup
operation that must be called. This analyzer reports calls to
functions like these when the result of the call is ignored.

The set of functions may be controlled using flags.

### `unusedvariable`

**Type:** `boolean` · **Default:** `true`

check for unused variables and suggest fixes

### `unusedwrite`

**Type:** `boolean` · **Default:** `true`

checks for unused writes

The analyzer reports instances of writes to struct fields and
arrays that are never read. Specifically, when a struct object
or an array is copied, its elements are copied implicitly by
the compiler, and any element write to this copy does nothing
with the original object.

For example:

	type T struct { x int }

	func f(input []T) {
		for i, v := range input {  // v is a copy
			v.x = i  // unused write to field x
		}
	}

Another example is about non-pointer receiver:

	type T struct { x int }

	func (t T) f() {  // t is a copy
		t.x = i  // unused write to field x
	}

### `waitgroup`

**Type:** `boolean` · **Default:** `true`

check for misuses of sync.WaitGroup

This analyzer detects mistaken calls to the (*sync.WaitGroup).Add
method from inside a new goroutine, causing Add to race with Wait:

	// WRONG
	var wg sync.WaitGroup
	go func() {
	        wg.Add(1) // "WaitGroup.Add called from inside new goroutine"
	        defer wg.Done()
	        ...
	}()
	wg.Wait() // (may return prematurely before new goroutine starts)

The correct code calls Add before starting the goroutine:

	// RIGHT
	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		...
	}()
	wg.Wait()

### `waitgroupgo`

**Type:** `boolean` · **Default:** `true`

replace wg.Add(1)/go/wg.Done() with wg.Go

The waitgroupgo analyzer simplifies goroutine management with `sync.WaitGroup`.
It replaces the common pattern

	wg.Add(1)
	go func() {
		defer wg.Done()
		...
	}()

with a single call to

	wg.Go(func(){ ... })

which was added in Go 1.25.

### `writestring`

**Type:** `boolean` · **Default:** `true`

detect inefficient string concatenation in uses of WriteString

The writestring analyzer offers to replace a call to WriteString(x + y) by
two calls WriteString(x); WriteString(y). This is more efficient because it
avoids the additional memory allocation produced by string concatenation;
instead we just write each string into the buffer directly.

It explicitly looks for calls to certain well-known writers such as
bytes.Buffer, strings.Builder and bufio.Writer. The analyzer will not suggest
a fix for calls to, say, (*os.File).WriteString, because for certain kinds of
file such as a UDP socket, it could split a single message into two.
Similarly it does not offer fixes when the type of the writer is unknown (as
in calls to io.WriteString).

For example:

	func f(a string, b string) string {
		 var s strings.Builder
		 s.WriteString(a+b)
		 return s.String()
	}

would become:

	func f(a string, b string) string {
		var s strings.Builder
		s.WriteString(a)
		s.WriteString(b)
		return s.String()
	}

### `yield`

**Type:** `boolean` · **Default:** `true`

report calls to yield where the result is ignored

After a yield function returns false, the caller should not call
the yield function again; generally the iterator should return
promptly.

This example fails to check the result of the call to yield,
causing this analyzer to report a diagnostic:

	yield(1) // yield may be called again (on L2) after returning false
	yield(2)

The corrected code is either this:

	if yield(1) { yield(2) }

or simply:

	_ = yield(1) && yield(2)

It is not always a mistake to ignore the result of yield.
For example, this is a valid single-element iterator:

	yield(1) // ok to ignore result
	return

It is only a mistake when the yield call that returned false may be
followed by another call.

