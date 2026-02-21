/**
 * 调用百度千帆 API，直接传递上下文，去除 Temp 文件和 acupoint.json/triggerpoint.json 中转
 */

let childrenCache = null;

async function loadChildren() {
  if (childrenCache) return childrenCache;
  try {
    const res = await fetch('/children.json');
    if (res.ok) {
      childrenCache = await res.json();
    }
  } catch (e) {
    console.warn('加载 children.json 失败:', e);
  }
  return childrenCache || [];
}

/**
 * 从 AI 回复中提取提到的穴位
 */
function extractAcupointsFromResponse(response, childrenList) {
  const acupoint = [];
  for (const item of childrenList) {
    const t = item.endsWith('2') ? item.slice(0, -1) : item;
    if (response.includes(t)) {
      acupoint.push(item);
    }
  }
  return acupoint;
}

/**
 * 骨骼描述转为上下文文本（替代 Skeleton 写入 Temp-S）
 */
export function skeletonToContext(skeleton) {
  if (!skeleton || typeof skeleton !== 'string') return '';
  return ' 用户摆出以下姿势：' + skeleton + ' 其中l是左，r是右，如leg_twistl表示左腿扭转，leg_twistr表示右腿扭转';
}

/**
 * 发送消息到百度千帆模型
 * @param {string} apiKey - 用户输入的 API Key
 * @param {Array} history - 聊天历史
 * @param {string} recognizeResult - 点云识别结果（来自 recognize.js）
 * @param {string} skeletonContext - 骨骼上下文（来自 skeletonToContext）
 * @param {string} compareMessage - 触发点比较结果（来自 compare.js）
 * @returns {Promise<{ response: string, acupoints: string[] }>}
 */
export async function sendToModel(apiKey, history, recognizeResult = '', skeletonContext = '', compareMessage = '') {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('请先输入 API Key');
  }

  const childrenList = await loadChildren();

  const modifiedHistory = history.map((msg, i) => {
    const content = msg.content || '';
    if (i === 0) {
      return { ...msg, content: 'prompt:你是一个AI医生。' + content };
    }
    if (i % 2 === 0) {
      return {
        ...msg,
        content:
          'prompt:诊断用户病情，给出相应的有什么指压疗法，有什么按摩疗法。注意：用户有全套的穴位图，给出尽量具体、含有穴位数量多（不少于5个）、具体的治疗方案。\nUser:' +
          content,
      };
    }
    return msg;
  });

  const lastIdx = modifiedHistory.length - 1;
  if (lastIdx >= 0) {
    modifiedHistory[lastIdx].content =
      (modifiedHistory[lastIdx].content || '') + recognizeResult + skeletonContext;
  }

  const res = await fetch('https://qianfan.baidubce.com/v2/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: 'ernie-lite-pro-128k',
      messages: modifiedHistory,
      temperature: 0.95,
      top_p: 0.7,
      penalty_score: 1,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API 请求失败: ${res.status} ${err}`);
  }

  const answer = await res.json();
  let response = answer.choices?.[0]?.message?.content || '';
  const acupoints = extractAcupointsFromResponse(response, childrenList);
  response += compareMessage;

  return { response, acupoints };
}
