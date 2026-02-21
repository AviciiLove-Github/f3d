/**
 * 使用 KD-Tree 比较点云与触发点，替代 compare.py
 * 不写入文件，直接返回结果
 */

// 简单的 3D KD-Tree 实现（用于最近邻距离查询）
function buildKDTree(points) {
  if (points.length === 0) return null;

  function build(pts, depth = 0) {
    if (pts.length === 0) return null;
    const axis = depth % 3;
    pts.sort((a, b) => a[axis] - b[axis]);
    const mid = Math.floor(pts.length / 2);
    const node = {
      point: pts[mid],
      left: build(pts.slice(0, mid), depth + 1),
      right: build(pts.slice(mid + 1), depth + 1),
      axis,
    };
    return node;
  }

  return build([...points]);
}

function sqDist(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return dx * dx + dy * dy + dz * dz;
}

function nearestDist(tree, point) {
  let bestSq = Infinity;

  function search(node) {
    if (!node) return;
    const d = sqDist(point, node.point);
    if (d < bestSq) bestSq = d;
    const diff = point[node.axis] - node.point[node.axis];
    const near = diff <= 0 ? node.left : node.right;
    const far = diff <= 0 ? node.right : node.left;
    search(near);
    if (diff * diff < bestSq) search(far);
  }

  search(tree);
  return Math.sqrt(bestSq);
}

/**
 * 计算 A 中每个点到 B 的最近邻距离
 */
function nearestDistancesKdtree(pointsA, pointsB) {
  const tree = buildKDTree(pointsB);
  return pointsA.map((p) => nearestDist(tree, p));
}

const TRIGGERPOINT_FILES = [
  '胸锁乳突肌锁骨支右.json',
  '胸锁乳突肌锁骨支左.json',
  '胸锁乳突肌胸骨支右.json',
  '胸锁乳突肌胸骨支左.json',
];

let triggerpointCache = null;

async function loadTriggerpointData() {
  if (triggerpointCache) return triggerpointCache;
  const cache = {};
  for (const filename of TRIGGERPOINT_FILES) {
    try {
      const res = await fetch(`/triggerpoint/${filename}`);
      if (res.ok) {
        cache[filename] = await res.json();
      }
    } catch (e) {
      console.warn(`加载触发点 ${filename} 失败:`, e);
    }
  }
  triggerpointCache = cache;
  return cache;
}

/**
 * 比较点云与触发点，返回 { triggerNames, message }
 * 不再写入 triggerpoint.json 和 Temp-C
 */
export async function compareTriggerPoints(points) {
  const pArr = points.map((pt) => [pt.x, pt.y, pt.z]);
  const fileData = await loadTriggerpointData();
  const fileDict = {};
  const out = [];

  for (const [filename, filePoints] of Object.entries(fileData)) {
    if (!Array.isArray(filePoints) || filePoints.length === 0) continue;
    const fileArr = filePoints.map((pt) => [pt.x, pt.y, pt.z]);
    const dists = nearestDistancesKdtree(pArr, fileArr);
    const count2 = dists.filter((d) => d < 1).length;
    if (count2 >= 0.2 * pArr.length) {
      out.push(filename.replace('.json', ''));
    }
    fileDict[filename] = dists.reduce((a, b) => a + b, 0) / dists.length;
  }

  if (out.length === 0) {
    const minKey = Object.keys(fileDict).reduce((a, b) =>
      fileDict[a] < fileDict[b] ? a : b
    );
    out.push(minKey.replace('.json', ''));
  }

  const find = out.length === 0 ? '，暂未找到对应的触发点' : '';
  const overall = out.join('、');
  const message = `\n\n另外，若使用触发点疗法${find}。\n最近的触发点为：${overall}。\n相关注意事项可查看《无痛一身轻》一书。`;

  return {
    triggerNames: out,
    message,
  };
}
