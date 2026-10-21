import { describe, expect, it } from 'vitest'
import { parseEmbeddedCharts, parseSelectedYear } from './statsHtmlParser'

describe('project statistics HTML parser', () => {
  it('reads the selected year from the real statistics filter', () => {
    const doc = new DOMParser().parseFromString(
      '<select name="year"><option value="2025">2025</option><option value="2026" selected>2026</option></select>',
      'text/html',
    )

    expect(parseSelectedYear(doc)).toBe('2026')
  })

  it('preserves doughnut chart type and its real labels and values', () => {
    const doc = new DOMParser().parseFromString(
      `<div class="dolgraphtitle">Lead amount by status</div>
      <script id="status-chart">
        new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['New', 'Won'],
            datasets: [{ label: '2026', data: [1200, 800] }]
          }
        })
      </script>`,
      'text/html',
    )

    expect(parseEmbeddedCharts(doc)).toEqual([
      {
        title: 'Lead amount by status',
        type: 'doughnut',
        labels: ['New', 'Won'],
        datasets: [{ label: '2026', data: [1200, 800] }],
      },
    ])
  })
})
