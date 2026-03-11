import React, { useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AvatarProps {
  url: string;
  blendshapes: Record<string, number>;
}

export function Avatar({ url, blendshapes }: AvatarProps) {
  const { scene } = useGLTF(url);
  const avatarRef = useRef<THREE.Group>(null);

  // Apply blendshapes on every frame
  useFrame(() => {
    if (!scene) return;
    
    scene.traverse((child) => {
      // Check if the child is a mesh with morph targets
      if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).morphTargetDictionary && (child as THREE.Mesh).morphTargetInfluences) {
        const mesh = child as THREE.Mesh;
        const dict = mesh.morphTargetDictionary;
        const influences = mesh.morphTargetInfluences;
        
        if (dict && influences) {
          // Update each blendshape based on the received data
          for (const [name, value] of Object.entries(blendshapes)) {
            // Some models might have prefixes like "blendShape1." or different naming conventions
            // Here we assume direct match or exact ARKit names
            const index = dict[name];
            if (index !== undefined) {
              // Smooth the transition slightly
              influences[index] = THREE.MathUtils.lerp(influences[index], value, 0.5);
            }
          }
        }
      }
    });
  });

  return <primitive ref={avatarRef} object={scene} />;
}
