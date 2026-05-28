import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
}

interface Constellation {
  name: string
  stars: Star[]
}

const constellations: Constellation[] = [
  // Big Dipper (北斗七星)
  {
    name: 'Big Dipper',
    stars: [
      { x: 15, y: 25 },
      { x: 20, y: 23 },
      { x: 25, y: 22 },
      { x: 30, y: 23 },
      { x: 32, y: 28 },
      { x: 28, y: 32 },
      { x: 24, y: 30 },
    ],
  },
  // Orion (猎户座 - 简化版)
  {
    name: 'Orion',
    stars: [
      { x: 70, y: 40 },
      { x: 75, y: 35 },
      { x: 80, y: 40 },
      { x: 72, y: 50 },
      { x: 75, y: 55 },
      { x: 78, y: 50 },
    ],
  },
  // Cassiopeia (仙后座 - W形)
  {
    name: 'Cassiopeia',
    stars: [
      { x: 50, y: 15 },
      { x: 55, y: 20 },
      { x: 60, y: 18 },
      { x: 65, y: 22 },
      { x: 70, y: 17 },
    ],
  },
  // Custom constellation (自定义星座)
  {
    name: 'Code Star',
    stars: [
      { x: 40, y: 65 },
      { x: 45, y: 70 },
      { x: 50, y: 68 },
      { x: 48, y: 75 },
    ],
  },
]

export function useStarfield(containerRef: React.RefObject<HTMLDivElement | null>) {
  const svgRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const starCount = 120

    // Generate random stars
    for (let i = 0; i < starCount; i++) {
      const star = document.createElement('div')
      star.className = 'lm-star'

      // Random size (1-3)
      const size = Math.random() < 0.7 ? 1 : Math.random() < 0.8 ? 2 : 3
      star.classList.add(`size-${size}`)

      // Some stars have accent color
      if (Math.random() < 0.15) {
        star.classList.add('accent')
      }

      // Fixed position in viewport units
      const x = Math.random() * 100
      const y = Math.random() * 100
      star.style.left = `${x}vw`
      star.style.top = `${y}vh`

      // Random animation delay
      star.style.animationDelay = `${Math.random() * 3}s`

      container.appendChild(star)
    }

    // Create SVG for constellation lines
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.classList.add('lm-constellations-svg')
    svgRef.current = svg
    container.appendChild(svg)

    // Create constellation stars and lines
    constellations.forEach((constellation) => {
      const constellationStars: Star[] = []

      // Create stars for this constellation
      constellation.stars.forEach((pos) => {
        const star = document.createElement('div')
        star.className = 'lm-star size-3 accent'
        star.style.left = `${pos.x}vw`
        star.style.top = `${pos.y}vh`
        star.style.animationDelay = `${Math.random() * 2}s`
        container.appendChild(star)
        constellationStars.push(pos)
      })

      // Draw lines between constellation stars
      for (let i = 0; i < constellationStars.length - 1; i++) {
        const start = constellationStars[i]
        const end = constellationStars[i + 1]

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
        line.setAttribute('x1', `${start.x}%`)
        line.setAttribute('y1', `${start.y}%`)
        line.setAttribute('x2', `${end.x}%`)
        line.setAttribute('y2', `${end.y}%`)
        line.setAttribute('stroke', 'rgba(134, 239, 172, 0.15)')
        line.setAttribute('stroke-width', '0.5')
        line.classList.add('lm-constellation-line')
        line.style.animationDelay = `${Math.random() * 3}s`

        svg.appendChild(line)
      }
    })

    // Cleanup
    return () => {
      if (container) {
        container.innerHTML = ''
      }
    }
  }, [containerRef])
}
