import skeletonDataRaw from '../data/unity_skeleton_data.json';

export interface Bone {
  id: string;
  basePosition: { x: number; y: number };
  baseRotation: number;
  orderInLayer: number;
}

const bones: Bone[] = Object.entries(skeletonDataRaw).map(([key, data]) => {
  const anyData = data as any;
  return {
    id: key,
    basePosition: { 
      x: anyData.transform.position.x, 
      y: anyData.transform.position.y 
    },
    baseRotation: anyData.transform.rotation.z,
    orderInLayer: anyData.spriteRenderer.orderInLayer
  };
});

// Sort ascending by orderInLayer for correct rendering order
export const sortedBones = bones.sort((a, b) => a.orderInLayer - b.orderInLayer);

export const boneMap = new Map<string, Bone>(sortedBones.map(b => [b.id, b]));
