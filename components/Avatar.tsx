import React, { Suspense } from 'react';
import { useGLTF, useFBX } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AvatarProps {
  url: string;
  type: 'gltf' | 'fbx';
  blendshapes: Record<string, number>;
}

// 放大系数：1.0 = 不放大，直接使用模型原始输出值
const BLENDSHAPE_AMPLIFY = 1.0;

// 已打印过形态键的 Mesh 集合（避免每帧刷屏）
const loggedMeshes = new Set<string>();

// 提取公共的 Blendshape 更新逻辑
function useBlendshapes(scene: THREE.Group | THREE.Object3D | null, blendshapes: Record<string, number>) {
  useFrame(() => {
    if (!scene) return;
    
    scene.traverse((child) => {
      // 检查子节点是否是带有 morph targets 的 Mesh
      if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).morphTargetDictionary && (child as THREE.Mesh).morphTargetInfluences) {
        const mesh = child as THREE.Mesh;
        const dict = mesh.morphTargetDictionary;
        const influences = mesh.morphTargetInfluences;
        
        if (dict && influences) {
          // 每个 Mesh 只打印一次形态键名称
          const meshId = mesh.uuid;
          if (!loggedMeshes.has(meshId)) {
            loggedMeshes.add(meshId);
            const names = Object.keys(dict);
            console.log(`[Avatar] Mesh "${mesh.name}" has ${names.length} morph targets:`, names);
          }
          
          // 根据接收到的数据更新每个 blendshape
          for (const [name, rawValue] of Object.entries(blendshapes)) {
            // 放大值并截断到 [0, 1]
            const value = Math.min(rawValue * BLENDSHAPE_AMPLIFY, 1.0);
            
            // 尝试直接匹配
            let index = dict[name];
            
            // 如果直接匹配失败，尝试首字母大写
            if (index === undefined) {
              const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
              index = dict[capitalized];
            }
            
            if (index === undefined) {
              // 尝试模糊匹配（处理带前缀的名称，如 "blendShape1.jawOpen"）
              const key = Object.keys(dict).find(k => 
                k.toLowerCase().endsWith(name.toLowerCase()) || 
                k.toLowerCase().includes('.' + name.toLowerCase())
              );
              if (key) index = dict[key];
            }
            
            if (index !== undefined) {
              // 使用 lerp 平滑过渡，使表情更自然
              influences[index] = THREE.MathUtils.lerp(influences[index], value, 0.5);
            }
          }
        }
      }
    });
  });
}

// GLTF/GLB 模型组件
function GLTFModel({ url, blendshapes }: { url: string, blendshapes: Record<string, number> }) {
  const { scene } = useGLTF(url);
  useBlendshapes(scene, blendshapes);
  return <primitive object={scene} />;
}

// FBX 模型组件
function FBXModel({ url, blendshapes }: { url: string, blendshapes: Record<string, number> }) {
  const scene = useFBX(url);
  useBlendshapes(scene, blendshapes);
  // FBX 模型通常可能需要调整缩放，这里默认缩放为 0.01，具体取决于你的 FBX 导出设置
  // 如果你的模型太大或太小，可以调整这里的 scale
  return <primitive object={scene} scale={0.01} />;
}

export function Avatar({ url, type, blendshapes }: AvatarProps) {
  return (
    <Suspense fallback={null}>
      {type === 'fbx' ? (
        <FBXModel url={url} blendshapes={blendshapes} />
      ) : (
        <GLTFModel url={url} blendshapes={blendshapes} />
      )}
    </Suspense>
  );
}
