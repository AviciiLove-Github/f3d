/**
 * 纯 JavaScript MLP 推理版本（JSON 权重）
 * 使用 Node.js 训练生成的 model_weights.json
 * 放置于 public/model_weights.json
 */

const CLASSES = [
  '上背部','上腹部','下背部','下腹部','下颌','内侧肘','内侧腕','内踝','右季肋区','右腰部',
  '右腹股沟区','外侧肘','外侧腕','外踝','大腿内侧','大腿前侧','大腿后侧','大腿外侧','大臂内侧',
  '大臂前侧','大臂后侧','大臂外侧','头部','小腿内侧','小腿前侧','小腿后侧','小腿外侧','小臂内侧',
  '小臂前侧','小臂后侧','小臂外侧','左季肋区','左腰部','左腹股沟区','手','牙齿','眼部','耳朵',
  '肩胛带','胸部','脐部','脚跟','膝内侧','膝前侧','膝后侧','膝外侧','臀部','足背','颈部','鼻'
];

const NUM_CLASSES = 50;

let layers = null;

/* ===============================
   加载 JSON 权重
================================ */
async function loadWeights() {
  if (layers) return layers;

  layers = await fetch('/model_weights.json').then(r => r.json());

  console.log('权重已加载', layers);
  return layers;
}

/* ===============================
   数学运算
================================ */

function relu(x) {
  return x > 0 ? x : 0;
}

function matMul(input, layer, useRelu = true) {
  const { W, b } = layer;
  const outSize = b.length;
  const output = new Float32Array(outSize);

  for (let j = 0; j < outSize; j++) {
    let sum = b[j];
    for (let i = 0; i < input.length; i++) {
      sum += input[i] * W[i][j];
    }
    output[j] = useRelu ? relu(sum) : sum;
  }

  return output;
}

/* ===============================
   单点预测
================================ */
function predictPoint(p, layers) {
  let x = new Float32Array([p.x, p.y, p.z]);

  x = matMul(x, layers[0], true);
  x = matMul(x, layers[1], true);
  x = matMul(x, layers[2], true);
  x = matMul(x, layers[3], false);

  // argmax
  let maxIdx = 0;
  let maxVal = x[0];
  for (let i = 1; i < x.length; i++) {
    if (x[i] > maxVal) {
      maxVal = x[i];
      maxIdx = i;
    }
  }
  return maxIdx;
}

/* ===============================
   对外接口：识别点云
================================ */
export async function recognize(points) {
  if (!Array.isArray(points) || points.length === 0) {
    return '\n根据点云，部位识别为: 未知';
  }

  const layers = await loadWeights();
  const counts = new Array(NUM_CLASSES).fill(0);

  for (const p of points) {
    const cls = predictPoint(p, layers);
    counts[cls]++;
  }

  const ratios = counts.map(c => c / points.length);

  const overallClasses = [];
  for (let i = 0; i < ratios.length; i++) {
    if (ratios[i] >= 0.2) overallClasses.push(CLASSES[i]);
  }

  if (overallClasses.length === 0) {
    const maxIdx = counts.indexOf(Math.max(...counts));
    overallClasses.push(CLASSES[maxIdx]);
  }

  return `\n根据点云，部位识别为: ${overallClasses.join('，')}`;
}