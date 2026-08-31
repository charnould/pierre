/** ECharts boot — palette + title/legend chrome matched to report type. */
window.__reportMountCharts = function () {
  if (typeof echarts === 'undefined') {
    console.error('[report] echarts missing')
    return
  }

  const PALETTE = [
    '#003f5c',
    '#31497e',
    '#674f95',
    '#a14e9a',
    '#d44c8d',
    '#f9596f',
    '#ff7a47',
    '#ffa600'
  ]
  const SANS = 'Manrope, system-ui, -apple-system, sans-serif'
  const INK = '#141414'
  const MUTE = '#6e6e6e'
  const RULE = '#ebebeb'

  const seriesList = (o) => (!o.series ? [] : Array.isArray(o.series) ? o.series : [o.series])

  const titleObj = (o) => {
    const t = o.title
    if (!t || Array.isArray(t)) return null
    return t.text || t.subtext ? t : null
  }

  const needsLegend = (o) => {
    if (o.legend === false || o.legend?.show === false) return false
    if (o.legend) return true
    const s = seriesList(o)
    if (s.some((x) => x?.name)) return true
    return s.some(
      (x) =>
        x &&
        (x.type === 'pie' || x.type === 'sunburst') &&
        Array.isArray(x.data) &&
        x.data.some((d) => d?.name)
    )
  }

  const isCartesian = (o) => !!(o.xAxis || o.yAxis)

  for (const el of document.querySelectorAll('[data-echarts]')) {
    if (el.__reportChart) continue

    let option
    try {
      option = JSON.parse(el.getAttribute('data-option') || '{}')
    } catch (e) {
      console.error('[report] bad data-option', el, e)
      continue
    }

    const t = titleObj(option)
    const titled = !!t
    const subtitled = !!(t && t.subtext)
    const legend = needsLegend(option)
    const cart = isCartesian(option)
    const inPair = !!el.closest('.charts-pair')

    el.style.height = `${
      inPair
        ? titled && legend
          ? 300
          : titled || legend
            ? 280
            : 260
        : titled && legend
          ? 400
          : titled || legend
            ? 370
            : 340
    }px`

    const merged = {
      color: PALETTE,
      textStyle: { fontFamily: SANS, color: MUTE },
      tooltip: {
        backgroundColor: '#ffffff',
        borderColor: RULE,
        borderWidth: 1,
        padding: [6, 8],
        textStyle: { color: INK, fontSize: 11, fontFamily: SANS },
        trigger: cart ? 'axis' : 'item',
        axisPointer: cart ? { type: 'line', lineStyle: { color: RULE, width: 1 } } : undefined
      },
      ...option,
      color: PALETTE
    }

    if (titled) {
      merged.title = {
        left: 2,
        top: 2,
        padding: 0,
        itemGap: 2,
        textStyle: {
          fontFamily: SANS,
          fontSize: 12,
          fontWeight: 600,
          color: INK,
          lineHeight: 15
        },
        subtextStyle: {
          fontFamily: SANS,
          fontSize: 10,
          fontWeight: 500,
          color: MUTE,
          lineHeight: 12
        },
        ...t
      }
    }

    if (legend) {
      merged.legend = {
        show: true,
        type: 'plain',
        orient: 'horizontal',
        bottom: 0,
        left: 'center',
        icon: 'circle',
        itemWidth: 7,
        itemHeight: 7,
        itemGap: 8,
        textStyle: { fontFamily: SANS, fontSize: 10, color: MUTE, fontWeight: 500 },
        ...(typeof option.legend === 'object' && option.legend ? option.legend : {}),
        show: true
      }
    }

    if (cart) {
      merged.grid = {
        left: 2,
        right: 6,
        top: titled ? (subtitled ? 38 : 26) : 6,
        bottom: legend ? 26 : 6,
        containLabel: true,
        ...option.grid
      }
      merged.categoryAxis = {
        axisLine: { lineStyle: { color: RULE } },
        axisTick: { show: false },
        axisLabel: { color: MUTE, fontFamily: SANS, fontSize: 10 },
        splitLine: { show: false }
      }
      merged.valueAxis = {
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: MUTE, fontFamily: SANS, fontSize: 10 },
        splitLine: { lineStyle: { color: RULE, type: 'solid' } }
      }
    }

    const chart = echarts.init(el, null, { renderer: 'canvas' })
    chart.setOption(merged, { notMerge: true })
    el.__reportChart = chart
    new ResizeObserver(() => chart.resize()).observe(el)
  }
}
