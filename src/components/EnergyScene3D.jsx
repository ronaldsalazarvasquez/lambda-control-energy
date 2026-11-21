import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Sky } from 'three/examples/jsm/objects/Sky.js'

// Escena 3D en tiempo real: energía sostenible para la agroindustria
// Molino de arroz + granja solar + aerogeneradores + arrozales al amanecer, con flujo de energía.
export default function EnergyScene3D({ onFail }) {
  const ref = useRef(null)

  useEffect(() => {
    const host = ref.current
    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    } catch (e) { onFail?.(); return }
    const W = () => host.clientWidth, H = () => host.clientHeight
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6))
    renderer.setSize(W(), H())
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.5
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, W() / H(), 0.5, 4000)
    camera.position.set(0, 9, 70)

    // ---------- Cielo físico y sol ----------
    const sky = new Sky()
    sky.scale.setScalar(10000)
    const su = sky.material.uniforms
    su.turbidity.value = 2.8
    su.rayleigh.value = 1.9
    su.mieCoefficient.value = 0.004
    su.mieDirectionalG.value = 0.82
    const sun = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(70), THREE.MathUtils.degToRad(245))
    su.sunPosition.value.copy(sun)
    scene.add(sky)

    // Entorno (reflejos) a partir del cielo
    const pmrem = new THREE.PMREMGenerator(renderer)
    const envScene = new THREE.Scene(); const sky2 = sky.clone(); envScene.add(sky2)
    const env = pmrem.fromScene(envScene).texture
    scene.environment = env
    scene.fog = new THREE.Fog(0xcdd7e2, 300, 2200)

    const sunLight = new THREE.DirectionalLight(0xffe2b8, 2.8)
    sunLight.position.copy(sun).multiplyScalar(300)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.set(2048, 2048)
    Object.assign(sunLight.shadow.camera, { left: -120, right: 120, top: 120, bottom: -120, near: 10, far: 900 })
    sunLight.shadow.bias = -0.0004
    scene.add(sunLight)
    scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x6f7a45, 0.45))

    // ---------- Arrozales (textura procedural con agua reflectante) ----------
    const S = 1024
    const cMap = document.createElement('canvas'); cMap.width = cMap.height = S
    const cRough = document.createElement('canvas'); cRough.width = cRough.height = S
    const g = cMap.getContext('2d'), r = cRough.getContext('2d')
    g.fillStyle = '#7f9a45'; g.fillRect(0, 0, S, S)
    r.fillStyle = '#e6e6e6'; r.fillRect(0, 0, S, S)
    const cells = 8, cs = S / cells
    for (let i = 0; i < cells; i++) for (let j = 0; j < cells; j++) {
      const flooded = (i * 7 + j * 3) % 9 === 0
      const hue = 72 + ((i * 13 + j * 7) % 18), light = 34 + ((i * 5 + j * 11) % 14)
      g.fillStyle = flooded ? '#5d7076' : `hsl(${hue} 42% ${light}%)`
      g.fillRect(i * cs + 3, j * cs + 3, cs - 6, cs - 6)
      // hileras de plantas
      if (!flooded) { g.strokeStyle = `hsla(${hue + 8} 50% ${light - 8}% / .6)`; g.lineWidth = 2; for (let k = 10; k < cs - 10; k += 7) { g.beginPath(); g.moveTo(i * cs + 8, j * cs + k); g.lineTo(i * cs + cs - 8, j * cs + k); g.stroke() } }
      r.fillStyle = flooded ? '#6a6a6a' : '#e8e8e8'
      r.fillRect(i * cs + 3, j * cs + 3, cs - 6, cs - 6)
    }
    g.fillStyle = '#8c8a58' // bordos
    for (let i = 0; i <= cells; i++) { g.fillRect(i * cs - 3, 0, 6, S); g.fillRect(0, i * cs - 3, S, 6) }
    const mapTex = new THREE.CanvasTexture(cMap), roughTex = new THREE.CanvasTexture(cRough)
    mapTex.colorSpace = THREE.SRGBColorSpace
    ;[mapTex, roughTex].forEach((t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(14, 14); t.anisotropy = 8 })
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshStandardMaterial({ map: mapTex, roughnessMap: roughTex, roughness: 1, metalness: 0, envMapIntensity: 0.7 }))
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    scene.add(ground)

    // ---------- Plantas de arroz en primer plano (con viento) ----------
    const blade = new THREE.PlaneGeometry(0.05, 0.75, 1, 4); blade.translate(0, 0.375, 0)
    const grassMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, side: THREE.DoubleSide })
    const uTime = { value: 0 }
    grassMat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = uTime
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 wp = instanceMatrix * vec4(position, 1.0);
        float sway = sin(uTime * 1.6 + wp.x * 0.35 + wp.z * 0.22) * 0.18 + sin(uTime * 3.1 + wp.x) * 0.04;
        transformed.x += sway * position.y * position.y;
        transformed.z += sway * 0.5 * position.y * position.y;`)
    }
    const N = 14000
    const grass = new THREE.InstancedMesh(blade, grassMat, N)
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3()
    const col = new THREE.Color()
    for (let i = 0; i < N; i++) {
      const row = Math.floor(Math.random() * 40)
      p.set((Math.random() - 0.5) * 140, 0, 40 - row * 1.1 + (Math.random() - 0.5) * 0.4)
      e.set((Math.random() - 0.5) * 0.4, Math.random() * Math.PI, (Math.random() - 0.5) * 0.35)
      q.setFromEuler(e)
      const s = 0.6 + Math.random() * 0.5
      sc.set(s, s * (0.8 + Math.random() * 0.5), s)
      m4.compose(p, q, sc); grass.setMatrixAt(i, m4)
      grass.setColorAt(i, col.setHSL(0.21 + Math.random() * 0.05, 0.55, 0.2 + Math.random() * 0.1))
    }
    scene.add(grass)

    // ---------- Molino de arroz ----------
    const mill = new THREE.Group(); mill.position.set(-14, 0, -120); mill.rotation.y = 0.3
    const steel = new THREE.MeshStandardMaterial({ color: 0xdfe4ea, metalness: 0.75, roughness: 0.32 })
    const wall = new THREE.MeshStandardMaterial({ color: 0xece7dd, roughness: 0.85 })
    const roof = new THREE.MeshStandardMaterial({ color: 0x8a97a8, metalness: 0.5, roughness: 0.45 })
    const add = (geo, mat, x, y, z, parent = mill) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m }
    for (let i = 0; i < 4; i++) {
      add(new THREE.CylinderGeometry(3.4, 3.4, 18, 48, 1, true), steel, 10 + i * 7.6, 9, 0)
      add(new THREE.ConeGeometry(3.5, 2.6, 48), steel, 10 + i * 7.6, 19.3, 0)
      for (let k = 1; k < 6; k++) add(new THREE.TorusGeometry(3.42, 0.06, 6, 48), roof, 10 + i * 7.6, k * 3, 0).rotation.x = Math.PI / 2
    }
    add(new THREE.BoxGeometry(3.4, 30, 3.4), wall, 3, 15, 0)
    add(new THREE.BoxGeometry(4.2, 2.4, 4.2), roof, 3, 31, 0)
    const bridge = add(new THREE.BoxGeometry(32, 1.2, 1.4), roof, 18, 26.5, 0); bridge.rotation.z = -0.24
    add(new THREE.BoxGeometry(20, 10, 14), wall, -10, 5, 2)
    const r1 = add(new THREE.BoxGeometry(21, 0.5, 8.6), roof, -10, 12, -1.6); r1.rotation.x = 0.5
    const r2 = add(new THREE.BoxGeometry(21, 0.5, 8.6), roof, -10, 12, 5.6); r2.rotation.x = -0.5
    const winMat = new THREE.MeshStandardMaterial({ color: 0xffd58a, emissive: 0xffb84a, emissiveIntensity: 0.6 })
    for (let k = 0; k < 4; k++) add(new THREE.BoxGeometry(2.2, 1.4, 0.1), winMat, -17 + k * 4.6, 6, 9.05)
    add(new THREE.CylinderGeometry(0.7, 0.9, 16, 16), roof, -18, 8, -3)
    scene.add(mill)

    // vapor de la secadora
    const steamTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c) })()
    const steam = []
    for (let i = 0; i < 18; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0.5 }))
      s.userData.t = i / 18; mill.add(s); steam.push(s)
    }

    // ---------- Granja solar ----------
    const panelGeo = new THREE.BoxGeometry(3.2, 0.08, 1.9)
    const panelMat = new THREE.MeshPhysicalMaterial({ color: 0x14233f, metalness: 0.4, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.6 })
    const rows = 7, perRow = 12
    const panels = new THREE.InstancedMesh(panelGeo, panelMat, rows * perRow)
    const legs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 1.4, 0.12), steel, rows * perRow)
    let n = 0
    for (let rI = 0; rI < rows; rI++) for (let c = 0; c < perRow; c++) {
      p.set(-58 + c * 3.5, 1.5, -22 - rI * 5.2)
      q.setFromEuler(e.set(-0.42, 0.18, 0)); m4.compose(p, q, sc.set(1, 1, 1)); panels.setMatrixAt(n, m4)
      m4.compose(p.clone().setY(0.7), new THREE.Quaternion(), sc); legs.setMatrixAt(n, m4); n++
    }
    panels.castShadow = true; panels.receiveShadow = true; legs.castShadow = true
    scene.add(panels, legs)

    // ---------- Aerogeneradores ----------
    const white = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.4, metalness: 0.1 })
    const bladeShape = new THREE.Shape(); bladeShape.moveTo(0, 0); bladeShape.quadraticCurveTo(1.6, 6, 0.9, 22); bladeShape.lineTo(0.3, 22); bladeShape.quadraticCurveTo(-0.5, 8, -0.6, 0); bladeShape.lineTo(0, 0)
    const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, { depth: 0.25, bevelEnabled: false })
    const rotors = []
    const turbines = [[-210, -260, 1], [-130, -330, 1.1], [-50, -280, 0.95], [30, -360, 1.15], [-300, -380, 1.2], [110, -420, 1.1], [190, -340, 1]]
    turbines.forEach(([x, z, s], i) => {
      const t = new THREE.Group(); t.position.set(x, 0, z); t.scale.setScalar(s); t.rotation.y = -0.4 + i * 0.05
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.8, 60, 24), white); tower.position.y = 30; tower.castShadow = true; t.add(tower)
      const nac = new THREE.Mesh(new THREE.BoxGeometry(3, 2.6, 7), white); nac.position.set(0, 61, -1); t.add(nac)
      const rotor = new THREE.Group(); rotor.position.set(0, 61, 2.8)
      rotor.add(new THREE.Mesh(new THREE.SphereGeometry(1.4, 24, 16), white))
      for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(bladeGeo, white); b.rotation.z = (k * Math.PI * 2) / 3; b.castShadow = true; rotor.add(b) }
      rotor.userData.speed = 0.55 + (i % 3) * 0.12
      rotor.rotation.z = i
      t.add(rotor); rotors.push(rotor); scene.add(t)
    })

    // ---------- Torres y líneas eléctricas ----------
    const lineMat = new THREE.LineBasicMaterial({ color: 0x6b7280, transparent: true, opacity: 0.6 })
    const pylons = [[-60, -230], [-38, -180], [-20, -140]]
    pylons.forEach(([x, z]) => {
      const pg = new THREE.Group(); pg.position.set(x, 0, z)
      const legM = new THREE.MeshStandardMaterial({ color: 0x8b95a3, metalness: 0.6, roughness: 0.5 })
      ;[[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]].forEach(([a, b]) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 26, 6), legM); l.position.set(a * 0.6, 13, b * 0.6); l.rotation.set(b * 0.05, 0, -a * 0.05); pg.add(l) })
      const arm = new THREE.Mesh(new THREE.BoxGeometry(12, 0.3, 0.3), legM); arm.position.y = 24; pg.add(arm)
      scene.add(pg)
    })
    for (const dx of [-5.5, 5.5]) {
      const pts = []
      for (let k = 0; k < pylons.length - 1; k++) {
        const [x1, z1] = pylons[k], [x2, z2] = pylons[k + 1]
        for (let s = 0; s <= 20; s++) { const t = s / 20; pts.push(new THREE.Vector3(x1 + (x2 - x1) * t + dx * 0.4, 24 - Math.sin(Math.PI * t) * 3, z1 + (z2 - z1) * t)) }
      }
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat))
    }

    // ---------- Flujo de energía (partículas doradas) ----------
    const target = new THREE.Vector3(-8, 10, -118)
    const curves = [
      new THREE.CatmullRomCurve3([new THREE.Vector3(-40, 3, -30), new THREE.Vector3(-24, 9, -70), target]),
      new THREE.CatmullRomCurve3([new THREE.Vector3(-30, 3, -50), new THREE.Vector3(-18, 12, -90), target]),
      new THREE.CatmullRomCurve3([new THREE.Vector3(-20, 24, -140), new THREE.Vector3(-12, 18, -128), target]),
      new THREE.CatmullRomCurve3([new THREE.Vector3(-50, 60, -280), new THREE.Vector3(-70, 40, -250), new THREE.Vector3(-60, 24, -230), new THREE.Vector3(-38, 24, -180), new THREE.Vector3(-20, 24, -140)]),
    ]
    const PN = 420
    const pPos = new Float32Array(PN * 3)
    const pData = Array.from({ length: PN }, () => ({ c: Math.floor(Math.random() * curves.length), t: Math.random(), v: 0.05 + Math.random() * 0.06 }))
    const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
    const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,236,170,1)'); gr.addColorStop(.3, 'rgba(255,200,60,.8)'); gr.addColorStop(1, 'rgba(255,190,40,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c) })()
    const pts = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 1.1, map: dot, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffd04a }))
    scene.add(pts)
    const v3 = new THREE.Vector3()

    // ---------- Animación ----------
    let mx = 0, my = 0
    const onMove = (ev) => { mx = ev.clientX / window.innerWidth - 0.5; my = ev.clientY / window.innerHeight - 0.5 }
    window.addEventListener('pointermove', onMove)
    const onResize = () => { camera.aspect = W() / H(); camera.updateProjectionMatrix(); renderer.setSize(W(), H()) }
    window.addEventListener('resize', onResize)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const clock = new THREE.Clock()
    const look = new THREE.Vector3()
    let raf
    const loop = () => {
      raf = requestAnimationFrame(loop)
      if (document.hidden) return
      const dt = Math.min(clock.getDelta(), 0.05) * (reduce ? 0.25 : 1)
      const t = (uTime.value += dt)
      rotors.forEach((r) => (r.rotation.z -= r.userData.speed * dt))
      pData.forEach((d, i) => {
        d.t += d.v * dt; if (d.t > 1) { d.t = 0; d.c = Math.floor(Math.random() * curves.length) }
        curves[d.c].getPoint(d.t, v3); pPos.set([v3.x, v3.y + Math.sin(t * 3 + i) * 0.15, v3.z], i * 3)
      })
      pGeo.attributes.position.needsUpdate = true
      steam.forEach((s) => {
        s.userData.t = (s.userData.t + dt * 0.08) % 1
        const k = s.userData.t
        s.position.set(-18 + Math.sin(k * 6 + t * 0.4) * 1.2 + k * 4, 16 + k * 22, -3 - k * 2)
        s.scale.setScalar(2 + k * 9); s.material.opacity = 0.45 * (1 - k)
      })
      // cámara cinematográfica con leve paralaje
      camera.position.x += ((Math.sin(t * 0.045) * 7 + mx * 6) - camera.position.x) * 0.03
      camera.position.y += ((9 + Math.sin(t * 0.06) * 0.8 - my * 2) - camera.position.y) * 0.03
      look.set(camera.position.x * 0.3 - 10, 15, -140)
      camera.lookAt(look)
      renderer.render(scene, camera)
    }
    loop()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('resize', onResize)
      scene.traverse((o) => { o.geometry?.dispose?.(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach((x) => { x.map?.dispose?.(); x.dispose?.() }) })
      env.dispose(); pmrem.dispose(); renderer.dispose()
      renderer.domElement.remove()
    }
  }, [onFail])

  return <div ref={ref} className="scene3d" />
}
