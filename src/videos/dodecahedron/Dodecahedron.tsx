import React, { useMemo } from 'react';
import * as THREE from 'three';
import {
  AbsoluteFill,
  Audio,
  staticFile,
  useCurrentFrame,
  useVideoConfig
} from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import { DodecahedronWorld } from './world';

export const DODECAHEDRON_FRAMES = 2130; // 71.0s at 30 fps

const SceneContent: React.FC = () => {
  const frame = useCurrentFrame();
  const { camera, scene } = useThree();

  const world = useMemo(() => {
    const w = new DodecahedronWorld();
    scene.add(w.root);
    return w;
  }, [scene]);

  world.update(frame, camera as THREE.PerspectiveCamera);

  return null;
};

export const DodecahedronShort: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Subtle cinematic letterbox / vignette gradient overlay
  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      {/* 3D WebGL Scene */}
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ fov: 48, near: 0.1, far: 1000 }}
      >
        <SceneContent />
      </ThreeCanvas>

      {/* Synchronized Master Audio: Narrator + Score + SFX */}
      <Audio src={staticFile('dodecahedron/mix.mp3')} />

      {/* Cinematic Vignette */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(circle at 50% 50%, transparent 62%, rgba(0, 0, 0, 0.72) 100%)',
          pointerEvents: 'none'
        }}
      />
    </AbsoluteFill>
  );
};
