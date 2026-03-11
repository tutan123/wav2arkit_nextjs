import React, { Suspense } from 'react';
import { useGLTF, useFBX } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AvatarProps {
  url: string;
  type: 'gltf' | 'fbx';
  blendshapes: Record<string, number>;
  isSilent: boolean;
}

// 放大系数：2.0 让动作更明显但不夸张，可按需调整
const BLENDSHAPE_AMPLIFY = 2.0;

// 已打印过形态键的 Mesh 集合（避免每帧刷屏）
const loggedMeshes = new Set<string>();

// 提取公共的 Blendshape 更新逻辑
function useBlendshapes(scene: THREE.Group | THREE.Object3D | null, blendshapes: Record<string, number>, isSilent: boolean) {
  useFrame(() => {
    if (!scene) return;
    
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).morphTargetDictionary && (child as THREE.Mesh).morphTargetInfluences) {
        const mesh = child as THREE.Mesh;
        const dict = mesh.morphTargetDictionary;
        const influences = mesh.morphTargetInfluences;
        
        if (dict && influences) {
          const meshId = mesh.uuid;
          if (!loggedMeshes.has(meshId)) {
            loggedMeshes.add(meshId);
            console.log(`[Avatar] Mesh "${mesh.name}" has ${Object.keys(dict).length} morph targets:`, Object.keys(dict));
          }
          
          // 静音时：所有形态键快速归零
          if (isSilent) {
            for (let i = 0; i < influences.length; i++) {
              if (influences[i] > 0.001) {
                influences[i] = THREE.MathUtils.lerp(influences[i], 0, 0.8);
              } else {
                influences[i] = 0;
              }
            }
            return;
          }
          
          // 有声音时：按 blendshapes 数据更新
          for (const [name, rawValue] of Object.entries(blendshapes)) {
            const value = Math.min(rawValue * BLENDSHAPE_AMPLIFY, 1.0);
            
            let index = dict[name];
            if (index === undefined) {
              const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
              index = dict[capitalized];
            }
            if (index === undefined) {
              const key = Object.keys(dict).find(k =>
                k.toLowerCase().endsWith(name.toLowerCase()) ||
                k.toLowerCase().includes('.' + name.toLowerCase())
              );
              if (key) index = dict[key];
            }
            
            if (index !== undefined) {
              influences[index] = THREE.MathUtils.lerp(influences[index], value, 0.4);
            }
          }
        }
      }
    });
  });
}

// GLTF/GLB 模型组件
function GLTFModel({ url, blendshapes, isSilent }: { url: string, blendshapes: Record<string, number>, isSilent: boolean }) {
  const { scene } = useGLTF(url);
  useBlendshapes(scene, blendshapes, isSilent);
  return <primitive object={scene} />;
}

function FBXModel({ url, blendshapes, isSilent }: { url: string, blendshapes: Record<string, number>, isSilent: boolean }) {
  const scene = useFBX(url);
  useBlendshapes(scene, blendshapes, isSilent);
  // FBX 模型通常可能需要调整缩放，这里默认缩放为 0.01，具体取决于你的 FBX 导出设置
  // 如果你的模型太大或太小，可以调整这里的 scale
  return <primitive object={scene} scale={0.01} />;
}

export function Avatar({ url, type, blendshapes, isSilent }: AvatarProps) {
  return (
    <Suspense fallback={null}>
      {type === 'fbx' ? (
        <FBXModel url={url} blendshapes={blendshapes} isSilent={isSilent} />
      ) : (
        <GLTFModel url={url} blendshapes={blendshapes} isSilent={isSilent} />
      )}
    </Suspense>
  );
}
