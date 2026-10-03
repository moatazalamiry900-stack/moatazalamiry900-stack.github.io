// =====================================================================
//  AXON BREACH — the hero's shadow costs almost nothing (heroperf.js)
//  The hero is ~106 000 triangles on a skeleton, and every frame he was drawn twice: once for the picture,
//  once more into the shadow map. The picture is left exactly as it is. For the shadow pass a stand-in is
//  bound to the SAME skeleton: one box per bone, fitted to the armour that bone carries (a few hundred
//  triangles, one draw call). It moves with every pose, so the shadow on the floor keeps its shape —
//  the full model simply no longer goes through the shadow pass.
//  Used for the player's hero and for co-op teammates (coop.js). Loaded by index.html after perf.js.
// =====================================================================
'use strict';

window.AxonHeroShadow = (function () {
    const NAME = 'shadow-proxy';
    const ghost = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, skinning: true });   // never seen in the picture, only by the shadow map
    const _v = new THREE.Vector3(), _m = new THREE.Matrix4(), _n = new THREE.Matrix4();
    const CORN = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
    const FACE = [0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 2, 3, 7, 2, 7, 6, 1, 2, 6, 1, 6, 5, 3, 0, 4, 3, 4, 7];

    function proxyFor(mesh) {
        const sk = mesh.skeleton, g = mesh.geometry, P = g.attributes.position, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
        if (!sk || !P || !SI || !SW) return null;
        const nb = sk.bones.length, boxes = new Array(nb).fill(null);
        for (let i = 0; i < P.count; i++) {                                           // every vertex goes to the box of the bone that carries it most
            let b = SI.getX(i), w = SW.getX(i); if (SW.getY(i) > w) { b = SI.getY(i); w = SW.getY(i); } if (SW.getZ(i) > w) { b = SI.getZ(i); w = SW.getZ(i); } if (SW.getW(i) > w) b = SI.getW(i);
            if (b >= nb) continue;
            _v.fromBufferAttribute(P, i).applyMatrix4(mesh.bindMatrix).applyMatrix4(sk.boneInverses[b]);
            (boxes[b] || (boxes[b] = new THREE.Box3())).expandByPoint(_v);
        }
        const pos = [], idx = [], si = [], sw = []; let n = 0;
        for (let b = 0; b < nb; b++) {
            const bx = boxes[b]; if (!bx) continue;
            const c = bx.getCenter(new THREE.Vector3()), s = bx.getSize(new THREE.Vector3()).multiplyScalar(0.46);      // a little inside the bounds: a box is fatter than a limb
            if (s.x + s.y + s.z < 0.05) continue;
            _n.copy(sk.boneInverses[b]).invert(); _m.copy(mesh.bindMatrix).invert().multiply(_n);                          // bone space → the mesh's bind space
            for (const k of CORN) { _v.set(c.x + (k[0] * 2 - 1) * s.x, c.y + (k[1] * 2 - 1) * s.y, c.z + (k[2] * 2 - 1) * s.z).applyMatrix4(_m); pos.push(_v.x, _v.y, _v.z); si.push(b, 0, 0, 0); sw.push(1, 0, 0, 0); }
            for (const f of FACE) idx.push(n + f); n += 8;
        }
        if (!n) return null;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
        geo.setIndex(idx); geo.computeVertexNormals(); geo.boundingSphere = g.boundingSphere ? g.boundingSphere.clone() : null; if (!geo.boundingSphere) geo.computeBoundingSphere();
        const px = new THREE.SkinnedMesh(geo, ghost); px.name = NAME; px.bind(sk, mesh.bindMatrix);
        px.position.copy(mesh.position); px.quaternion.copy(mesh.quaternion); px.scale.copy(mesh.scale);
        px.castShadow = true; px.receiveShadow = false; px.frustumCulled = mesh.frustumCulled; px.renderOrder = -5;
        return px;
    }
    // root: a hero's group. Returns how many triangles left the shadow pass.
    function apply(root) {
        if (!root || has(root)) return 0;
        const big = []; root.traverse(o => { if (o.isSkinnedMesh && o.castShadow && o.geometry && o.geometry.attributes.position.count > 600) big.push(o); });
        let saved = 0;
        for (const m of big) {
            let px = null; try { px = proxyFor(m); } catch (e) { px = null; }
            if (!px) continue;
            (m.parent || root).add(px); m.castShadow = false;
            saved += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3 - px.geometry.index.count / 3;
        }
        return saved;
    }
    const has = root => { let f = false; root.traverse(o => { if (o.name === NAME) f = true; }); return f; };
    // the player's hero: now, and again whenever his body is rebuilt (another body type in the customiser)
    setInterval(() => { const P = window.__axonPlayer; if (P && P.mesh && !has(P.mesh)) { try { apply(P.mesh); } catch (e) { } } }, 1200);
    return { apply, has };
})();
