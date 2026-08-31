# Desktop performance report

Captured on macOS arm64 (Apple M1 Pro, 8 CPUs). Bundle metrics compare the same working tree before and after the performance changes. Runtime metrics are the current cold shell; future runs can compare them on the target low-spec Windows profile.

| Metric                   |      Before |       After | Change |
| ------------------------ | ----------: | ----------: | -----: |
| Renderer entry raw       | 1,366.0 KiB |   614.6 KiB | -55.0% |
| Renderer cold-start raw  | 3,479.9 KiB | 2,205.2 KiB | -36.6% |
| Renderer cold-start gzip |   787.8 KiB |   516.8 KiB | -34.4% |
| Main JS raw              |   966.7 KiB |   969.0 KiB |  +0.2% |
| Renderer total JS raw    | 6,662.7 KiB | 6,684.2 KiB |  +0.3% |

## Repayment board (10,000 cases)

| Operation       |  Median |
| --------------- | ------: |
| Map API rows    | 0.47 ms |
| Group buckets   | 0.22 ms |
| Apply filter    | 0.50 ms |
| Build one facet | 1.37 ms |

The complete dataset remains local after loading, so filtering, sorting and scrolling keep their existing behavior. Facets are computed only when their menu opens.

## DOCX inspection

Cold: 56.90 ms · warm median: 0.67 ms. This stays client-side because a server round trip would cost more than the measured work.

## Electron cold shell

Median of three runs: ready to show 432 ms. At 2.0 seconds: main working set 193.6 MiB, renderer working set 142.6 MiB, renderer heap 9.5 MiB, 75 DOM nodes.

Regenerate on demand:

```sh
bun --filter "@pierre/desktop" build
bun --filter "@pierre/desktop" perf:bench -- --label candidate
bun --filter "@pierre/desktop" perf:report -- --baseline before --candidate candidate
```
