import skeletonDataRaw from '../data/unity_skeleton_data.json';

export interface Bone {
    id: string;
    basePosition: { x: number; y: number };
    baseRotation: number;
    orderInLayer: number;
    joint?: {
        connectedBody: string | null;
        anchor: { x: number; y: number };
        connectedAnchor: { x: number; y: number };
    };
    collider?: {
        type: 'BoxCollider2D' | 'CircleCollider2D';
        size?: { x: number; y: number };
        radius?: number;
        offset: { x: number; y: number };
    };
}

const bones: Bone[] = Object.entries(skeletonDataRaw).map(([key, data]) => {
    const anyData = data as any;
    let px = anyData.transform.position.x;
    let py = anyData.transform.position.y;
    
    // eyes and nosebleed are children of head, so their coordinates are local to head.
    if (key === 'eyes' || key === 'nosebleed') {
        const headData = (skeletonDataRaw as any).head;
        if (headData) {
            px += headData.transform.position.x;
            py += headData.transform.position.y;
        }
    }
    
    const bone: Bone = {
        id: key,
        basePosition: { x: px, y: py },
        baseRotation: anyData.transform.rotation.z,
        orderInLayer: anyData.spriteRenderer.orderInLayer
    };
    
    if (anyData.collider2D) {
        bone.collider = {
            type: anyData.collider2D.type,
            size: anyData.collider2D.size,
            radius: anyData.collider2D.radius,
            offset: anyData.collider2D.offset
        };
    }
    
    if (anyData.hingeJoint2D) {
        bone.joint = {
            connectedBody: anyData.hingeJoint2D.connectedBody,
            anchor: { x: anyData.hingeJoint2D.anchor.x, y: anyData.hingeJoint2D.anchor.y },
            connectedAnchor: { x: anyData.hingeJoint2D.connectedAnchor.x, y: anyData.hingeJoint2D.connectedAnchor.y }
        };
    }
    
    // Handle eyes/nosebleed which don't have hingeJoint2D but are logically connected to head
    if (key === 'eyes' || key === 'nosebleed') {
        bone.joint = {
            connectedBody: 'head',
            anchor: { x: 0, y: 0 },
            connectedAnchor: { x: anyData.transform.position.x, y: anyData.transform.position.y }
        };
    }
    
    // Tail has no hingeJoint2D but is logically a child of downTorso
    if (key === 'tail') {
        bone.joint = {
            connectedBody: 'downTorso',
            anchor: { x: 0, y: 0 },
            connectedAnchor: { x: anyData.transform.position.x, y: anyData.transform.position.y }
        };
    }
    
    return bone;
});


// Sort ascending by orderInLayer for correct rendering order
export const sortedBones = bones.sort((a, b) => a.orderInLayer - b.orderInLayer);

export const boneMap = new Map<string, Bone>(sortedBones.map(b => [b.id, b]));

export const boneToSpriteMap: Record<string, string> = {
    head: 'experimentHead.png',
    eyes: 'experimentEyeOpen.png',
    nosebleed: 'experimentNosebleed.png',
    upTorso: 'experimentUpTorso.png',
    downTorso: 'experimentDownTorso.png',
    frontUpArm: 'experimentUpArm.png',
    backUpArm: 'experimentUpArm.png',
    frontDownArm: 'experimentDownArm.png',
    backDownArm: 'experimentDownArm.png',
    frontHandF: 'experimentHandF.png',
    backHandB: 'experimentHandB.png',
    frontThigh: 'experimentThigh.png',
    backThigh: 'experimentThigh.png',
    frontCrus: 'experimentCrus.png',
    backCrus: 'experimentCrus.png',
    frontFoot: 'experimentFoot.png',
    backFoot: 'experimentFoot.png',
    tail: 'experimentTail.png'
};
