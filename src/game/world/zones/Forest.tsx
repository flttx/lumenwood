import { forestTrees } from './forestLayout'
// Deterministic primitive placeholders, not production art assets.
export function Forest() {
  return <><mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[50, 50]}/><meshStandardMaterial color="#718b69" roughness={1}/></mesh>
    {forestTrees.map((tree, i) => <group key={i} position={[tree.x, 0, tree.z]} scale={tree.scale}>
      <mesh position={[0, 1.4, 0]}><cylinderGeometry args={[0.22, 0.4, 2.8, 7]}/><meshStandardMaterial color="#716457"/></mesh>
      <mesh position={[0, 3.1, 0]}><coneGeometry args={[1.5, 3.4, 7]}/><meshStandardMaterial color={i % 2 ? '#526f60' : '#63836a'} roughness={1}/></mesh>
    </group>)}
  </>
}
