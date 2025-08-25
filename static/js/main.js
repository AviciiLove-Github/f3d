import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// 场景初始化
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff); // 设置场景背景为白色
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance"
});

// 渲染器配置
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

// 添加UI按钮
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'button-container';
    document.body.appendChild(buttonContainer);

    const colorButton = document.createElement('button');
    colorButton.textContent = '涂色';
    colorButton.className = 'btn';
    buttonContainer.appendChild(colorButton);

    const exportButton = document.createElement('button');
    exportButton.textContent = '导出';
    exportButton.className = 'btn';
    buttonContainer.appendChild(exportButton);

// 添加点大小控制
const widthControl = document.createElement('div');
widthControl.className = 'control-panel';

const widthRow = document.createElement('div');
widthRow.className = 'control-row';

const widthLabel = document.createElement('span');
widthLabel.textContent = '点大小:';
widthLabel.className = 'control-label';
widthRow.appendChild(widthLabel);

const widthSlider = document.createElement('input');
widthSlider.type = 'range';
widthSlider.min = '0.01';
widthSlider.max = '0.2';
widthSlider.step = '0.01';
widthSlider.value = '0.1';
widthSlider.className = 'control-slider';
widthRow.appendChild(widthSlider);

const widthValue = document.createElement('span');
widthValue.textContent = '0.1';
widthValue.className = 'control-value';
widthRow.appendChild(widthValue);

widthControl.appendChild(widthRow);
buttonContainer.appendChild(widthControl);

// 添加点密度控制
const densityControl = document.createElement('div');
densityControl.className = 'control-panel';

const densityRow = document.createElement('div');
densityRow.className = 'control-row';

const densityLabel = document.createElement('span');
densityLabel.textContent = '点密度:';
densityLabel.className = 'control-label';
densityRow.appendChild(densityLabel);

const densitySlider = document.createElement('input');
densitySlider.type = 'range';
densitySlider.min = '1';
densitySlider.max = '10';
densitySlider.step = '1';
densitySlider.value = '3';
densitySlider.className = 'control-slider';
densityRow.appendChild(densitySlider);

const densityValue = document.createElement('span');
densityValue.textContent = '3';
densityValue.className = 'control-value';
densityRow.appendChild(densityValue);

densityControl.appendChild(densityRow);
buttonContainer.appendChild(densityControl);

// 创建按钮行容器
const buttonRow = document.createElement('div');
buttonRow.className = 'button-row';

// 添加清空按钮
const clearButton = document.createElement('button');
clearButton.textContent = '清空点云';
clearButton.className = 'btn compact clear-btn';
buttonRow.appendChild(clearButton);

// 添加撤销按钮
const undoButton = document.createElement('button');
undoButton.textContent = '撤销';
undoButton.className = 'btn compact';
buttonRow.appendChild(undoButton);

// 添加处理点云按钮
const processPointCloudButton = document.createElement('button');
processPointCloudButton.textContent = '处理点云';
processPointCloudButton.className = 'btn compact';
buttonRow.appendChild(processPointCloudButton);

// 添加刷新按钮
const refreshButton = document.createElement('button');
refreshButton.textContent = '刷新列表';
refreshButton.className = 'btn compact';
buttonRow.appendChild(refreshButton);

buttonContainer.appendChild(buttonRow);

// 创建树状结构容器
const treeContainer = document.createElement('div');
treeContainer.className = 'tree-container';
document.body.appendChild(treeContainer);

// 添加滚动条样式
const style = document.createElement('style');
style.textContent = `
    .tree-container::-webkit-scrollbar {
        width: 8px;
    }
    .tree-container::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 4px;
    }
    .tree-container::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 4px;
    }
    .tree-container::-webkit-scrollbar-thumb:hover {
        background: #555;
    }
`;
document.head.appendChild(style);

// 为树状结构容器添加CSS类
treeContainer.classList.add('tree-container');

// 创建聊天框
const chatContainer = document.createElement('div');
chatContainer.className = 'chat-container';
document.body.appendChild(chatContainer);

// 聊天框标题
const chatTitle = document.createElement('div');
chatTitle.textContent = 'f3d';
chatTitle.className = 'chat-title';
chatContainer.appendChild(chatTitle);

// 聊天消息区域
const chatMessages = document.createElement('div');
chatMessages.className = 'chat-messages';
chatContainer.appendChild(chatMessages);

// 输入区域
const chatInputArea = document.createElement('div');
chatInputArea.className = 'chat-input-container';
chatContainer.appendChild(chatInputArea);

// 输入框
const chatInput = document.createElement('input');
chatInput.type = 'text';
chatInput.placeholder = '输入消息...';
chatInput.className = 'chat-input';
chatInputArea.appendChild(chatInput);

// 发送按钮
const sendButton = document.createElement('button');
sendButton.textContent = '发送';
sendButton.className = 'chat-send-btn';
chatInputArea.appendChild(sendButton);

// 聊天框样式已在CSS中定义

// 聊天历史记录
let chatHistory = [];
let chatPending = false;

// 聊天功能
function addMessage(message, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'ai'}`;
    // 支持换行符显示
    messageDiv.innerHTML = message.replace(/\n/g, '<br>');
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 发送消息功能（带历史记录）
async function sendMessage() {
    if (chatPending) return;
    const message = chatInput.value.trim();
    if (message === '') return;
    // 移除点云必须处理的限制，空点云也可发送
    if (paintedPoints && paintedPoints.length > 0 && !window.lastPointCloudProcessed) {
        await processPointCloudBeforeChat();
        if (paintedPoints.length > 0 && !window.lastPointCloudProcessed) {
            addMessage('点云处理失败，无法发送消息。', false);
            return;
        }
    }
    chatPending = true;
    sendButton.disabled = true;
    chatInput.disabled = true;
    addMessage(message, true);
    chatInput.value = '';
    const historyToSend = chatHistory.slice();
    historyToSend.push({ role: 'user', content: message });
    try {
        addMessage('正在处理您的消息...', false);
        const response = await fetch('/api/send-to-model', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: message, history: historyToSend })
        });
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                addMessage(`AI回复：${result.result}`, false);
                chatHistory.push({ role: 'user', content: message });
                chatHistory.push({ role: 'assistant', content: result.result });

                await loadTriggerPointStructure();
                // 刷新后自动勾选
                setTimeout(async () => {
                    await autoCheckElements();
                }, 500);
            } else {
                addMessage(`AI处理失败：${result.error}`, false);
            }
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error sending message:', error);
        addMessage(`发送失败: ${error.message}`, false);
    } finally {
        chatPending = false;
        sendButton.disabled = false;
        chatInput.disabled = false;
    }
}

// 点云处理前置函数
async function processPointCloudBeforeChat() {
    if (!paintedPoints || paintedPoints.length === 0) return;
    window.lastPointCloudProcessed = false;
    const points = paintedPoints.map(point => ({ x: point.x, y: point.y, z: point.z }));
    try {
        addMessage('正在自动处理点云数据...', false);
        const response = await fetch('/api/process-pointcloud', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(points)
        });
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                addMessage(`点云处理完成，分析结果：${result.result}`, false);
                window.lastPointCloudProcessed = true;
            } else {
                addMessage(`点云处理失败：${result.error}`, false);
            }
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        addMessage(`点云处理失败: ${error.message}`, false);
    }
}

// 发送按钮点击事件
sendButton.addEventListener('click', sendMessage);

// 输入框回车事件
chatInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

// 添加欢迎消息
addMessage('您好！我是f3d，一个AI医生，有什么可以帮助您的吗？');

// 存储当前点大小
let currentPointSize = 0.1;

// 存储当前点密度
let currentPointDensity = 3;

// 存储点云历史记录
let pointCloudHistory = [];

// 缓存所有Mesh的原始材质
let originalMaterialsMap = new Map();

// 保存当前状态到历史记录
function saveToHistory() {
    const currentState = [];
    scene.traverse((object) => {
        if (object instanceof THREE.Mesh && 
            object.material instanceof THREE.MeshBasicMaterial && 
            object.material.color.getHex() === 0x00ff00) {
            currentState.push({
                position: object.position.clone(),
                size: object.geometry.parameters.radius
            });
        }
    });
    pointCloudHistory.push(currentState);
}

// 撤销功能
function undo() {
    if (pointCloudHistory.length > 0) {
        // 移除最后一个状态
        pointCloudHistory.pop();
        
        // 清空当前场景
        const objectsToRemove = [];
        scene.traverse((object) => {
            if (object instanceof THREE.Mesh && 
                object.material instanceof THREE.MeshBasicMaterial && 
                object.material.color.getHex() === 0x00ff00) {
                objectsToRemove.push(object);
            }
        });
        
        objectsToRemove.forEach(object => {
            scene.remove(object);
            object.geometry.dispose();
            object.material.dispose();
        });
        
        // 恢复上一个状态
        if (pointCloudHistory.length > 0) {
            const lastState = pointCloudHistory[pointCloudHistory.length - 1];
            lastState.forEach(pointData => {
                const geometry = new THREE.SphereGeometry(pointData.size, 8, 8);
                const material = new THREE.MeshBasicMaterial({ 
                    color: 0x00ff00,
                    transparent: true,
                    opacity: 0.2
                });
                const sphere = new THREE.Mesh(geometry, material);
                sphere.position.copy(pointData.position);
                scene.add(sphere);
            });
        }
        
        // 更新点云数据
        paintedPoints = pointCloudHistory.length > 0 ? 
            pointCloudHistory[pointCloudHistory.length - 1].map(p => p.position) : [];
        
        renderer.render(scene, camera);
    }
}

// 更新点大小显示
widthSlider.addEventListener('input', (e) => {
    currentPointSize = parseFloat(e.target.value);
    widthValue.textContent = currentPointSize.toFixed(2);
});

// 更新点密度显示
densitySlider.addEventListener('input', (e) => {
    currentPointDensity = parseInt(e.target.value);
    densityValue.textContent = currentPointDensity;
});

// 清空点云功能
clearButton.addEventListener('click', () => {
    const objectsToRemove = [];
    scene.traverse((object) => {
        if (object instanceof THREE.Mesh && 
            object.material instanceof THREE.MeshBasicMaterial && 
            object.material.color.getHex() === 0x00ff00) {
            objectsToRemove.push(object);
        }
    });
    
    objectsToRemove.forEach(object => {
        scene.remove(object);
        object.geometry.dispose();
        object.material.dispose();
    });
    
    paintedPoints = [];
    pointCloudHistory = []; // 清空历史记录
    renderer.render(scene, camera);
});

// 射线检测相关
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isPainting = false;
let currentModel = null;
let paintedPoints = [];

// 灯光配置
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

const directionalLight1 = new THREE.DirectionalLight(0xffffff, 2);
directionalLight1.position.set(5, 5, 5);
scene.add(directionalLight1);

// 新增几个方向光，照亮模型背面和下方
const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight2.position.set(-5, 5, 5);
scene.add(directionalLight2);

const directionalLight3 = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight3.position.set(5, 5, -5);
scene.add(directionalLight3);

const directionalLight4 = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight4.position.set(-5, 5, -5);
scene.add(directionalLight4);

const directionalLight5 = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight5.position.set(0, -5, 0);
scene.add(directionalLight5);

// Draco加载器配置
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/static/js/jsm/libs/draco/');

// GLTF加载器集成
const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

// 模型加载
loader.load(
    './static/models/exDraco.glb', 
    (gltf) => {
        const model = gltf.scene;
        currentModel = model;
        // 缓存所有Mesh的原始材质
        model.traverse(child => {
            if (child.isMesh) {
                originalMaterialsMap.set(child.uuid, child.material);
            }
        });
        
        // 坐标系调整
        model.position.set(0, 0, 0); 
        model.rotation.y = Math.PI / 2; 
        model.scale.set(1, 1, 1);
        
        scene.add(model);
        console.log('Model loaded:', model);
        
        // 模型加载完成后执行自动勾选
        setTimeout(async () => {
            await autoCheckElements();
        }, 1000);
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    (error) => {
        console.error('Error loading model:', error);
    }
);

// 递归输出对象结构的函数
function dumpObject(obj, indent = '') {
    const lines = [];
    
    // 基本信息
    lines.push(`${indent}${obj.type}: ${obj.name || 'unnamed'} (${obj.uuid})`);
    
    // 位置信息
    if (obj.position) {
        lines.push(`${indent}  Position: (${obj.position.x.toFixed(3)}, ${obj.position.y.toFixed(3)}, ${obj.position.z.toFixed(3)})`);
    }
    
    // 旋转信息
    if (obj.rotation) {
        lines.push(`${indent}  Rotation: (${obj.rotation.x.toFixed(3)}, ${obj.rotation.y.toFixed(3)}, ${obj.rotation.z.toFixed(3)})`);
    }
    
    // 缩放信息
    if (obj.scale) {
        lines.push(`${indent}  Scale: (${obj.scale.x.toFixed(3)}, ${obj.scale.y.toFixed(3)}, ${obj.scale.z.toFixed(3)})`);
    }
    
    // 材质信息
    if (obj.material) {
        lines.push(`${indent}  Material: ${obj.material.name || 'unnamed'} (${obj.material.type})`);
    }
    
    // 几何体信息
    if (obj.geometry) {
        lines.push(`${indent}  Geometry: ${obj.geometry.type}`);
        if (obj.geometry.attributes && obj.geometry.attributes.position) {
            const count = obj.geometry.attributes.position.count;
            lines.push(`${indent}    Vertices: ${count}`);
        }
    }
    
    // 递归处理子对象
    if (obj.children && obj.children.length > 0) {
        lines.push(`${indent}  Children:`);
        obj.children.forEach(child => {
            lines.push(...dumpObject(child, indent + '    '));
        });
    }
    
    return lines;
}

// 相机位置
camera.position.z = 5;

// 添加控制器
let controls = new OrbitControls(camera, renderer.domElement);
controls.minDistance = 0.01; // 允许极近距离
controls.maxDistance = Infinity; // 允许无限远
if ('minZoom' in controls) controls.minZoom = 0.01;
if ('maxZoom' in controls) controls.maxZoom = Infinity;

// 鼠标事件处理
function onMouseDown(event) {
    if (colorButton.classList.contains('active')) {
        // 只在左键点击时启用涂色功能
        if (event.button === 0) { // 0 表示左键
            isPainting = true;
            controls.enabled = false;
        }
    }
}

function onMouseMove(event) {
    // 只在左键按下且处于涂色模式时进行涂色
    if (!isPainting || !currentModel || event.buttons !== 1) return;

    // 计算鼠标位置
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // 更新射线
    raycaster.setFromCamera(mouse, camera);
    
    // 检测与模型的交点
    const intersects = raycaster.intersectObject(currentModel, true);
    
    if (intersects.length > 0) {
        const point = intersects[0].point;
        paintedPoints.push(point);
        
        // 创建着色点，使用半透明绿色
        const geometry = new THREE.SphereGeometry(currentPointSize, 8, 8);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00,
            transparent: true,
            opacity: 0.2
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(point);
        scene.add(sphere);

        // 在鼠标移动时创建多个点以提高密度
        const numPoints = currentPointDensity;
        for (let i = 0; i < numPoints; i++) {
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * currentPointSize * 2,
                (Math.random() - 0.5) * currentPointSize * 2,
                (Math.random() - 0.5) * currentPointSize * 2
            );
            const newPoint = point.clone().add(offset);
            paintedPoints.push(newPoint);
            
            const newGeometry = new THREE.SphereGeometry(currentPointSize, 8, 8);
            const newMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x00ff00,
                transparent: true,
                opacity: 0.2
            });
            const newSphere = new THREE.Mesh(newGeometry, newMaterial);
            newSphere.position.copy(newPoint);
            scene.add(newSphere);
        }
        
        // 保存当前状态到历史记录
        saveToHistory();
    }
}

function onMouseUp(event) {
    // 只在左键释放时重置涂色状态
    if (event.button === 0) {
        isPainting = false;
        controls.enabled = true;
    }
}

// 按钮事件处理
colorButton.addEventListener('click', () => {
    colorButton.classList.toggle('active');
    // 移除旧的背景色设置，交由CSS控制
});

// 树状结构按钮事件处理
// treeButton.addEventListener('click', async () => { // 删除列表控件按钮
//     if (treeContainer.style.display === 'none') {
//         treeContainer.style.display = 'block';
//         await loadTriggerPointStructure();
//     } else {
//         treeContainer.style.display = 'none';
//     }
// });

// 页面加载时自动显示树状结构
window.addEventListener('load', async () => {
    // 调整树状结构容器的位置，放在控件下方
    const buttonContainerHeight = buttonContainer.offsetHeight;
    treeContainer.style.top = (buttonContainerHeight + 20) + 'px';
    await loadTriggerPointStructure();
});

// 自动勾选函数
async function autoCheckElements() {
    try {
        // 自动勾选triggerpoint.json中的触发点
        const labelResponse = await fetch('./static/models/triggerpoint.json');
        if (labelResponse.ok) {
            const labelData = await labelResponse.json();
            console.log('Auto-checking trigger points from triggerpoint.json:', labelData);
            
            if (Array.isArray(labelData)) {
                labelData.forEach(fileName => {
                    setTimeout(() => {
                        const checkbox = document.getElementById(`checkbox_${fileName}`);
                        if (checkbox && !checkbox.checked) {
                            checkbox.checked = true;
                            togglePointCloud(fileName);
                        }
                    }, 100);
                });
            }
        }
        
        // 自动勾选acupoint.json中的穴位
        const acupointResponse = await fetch('./static/models/acupoint.json');
        if (acupointResponse.ok) {
            const acupointData = await acupointResponse.json();
            console.log('Auto-checking acupoints from acupoint.json:', acupointData);
            
            if (Array.isArray(acupointData)) {
                acupointData.forEach(acupoint => {
                    setTimeout(() => {
                        const checkbox = document.getElementById(`acupoint_${acupoint}`);
                        if (checkbox && !checkbox.checked) {
                            checkbox.checked = true;
                            toggleAcupointHighlight(acupoint);
                        }
                    }, 200);
                });
            }
        }
    } catch (error) {
        console.warn('Could not auto-check elements:', error);
    }
}

// 刷新按钮事件处理
refreshButton.addEventListener('click', async () => {
    await loadTriggerPointStructure();
    
    // 刷新后自动勾选
    setTimeout(async () => {
        await autoCheckElements();
    }, 500);
});

// 处理点云按钮事件处理
let processPending = false;
processPointCloudButton.addEventListener('click', async () => {
    if (processPending) return;
    if (paintedPoints && paintedPoints.length > 0) {
        processPending = true;
        processPointCloudButton.disabled = true;
        const points = paintedPoints.map(point => ({
            x: point.x,
            y: point.y,
            z: point.z
        }));
        try {
            addMessage('正在处理点云数据...', false);
            const response = await fetch('/api/process-pointcloud', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(points)
            });
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    addMessage(`处理完成！\n\n共绘制了 ${points.length} 个点。\n\n分析结果：${result.result}`, false);
                } else {
                    addMessage(`点云处理失败：${result.error}`, false);
                }
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error processing point cloud:', error);
            addMessage(`处理失败: ${error.message}`, false);
        } finally {
            processPending = false;
            processPointCloudButton.disabled = false;
        }
    } else {
        addMessage('您还没有绘制点云，请先使用涂色功能', false);
    }
    
    await loadTriggerPointStructure();
    
    // 刷新后自动勾选
    setTimeout(async () => {
        await autoCheckElements();
    }, 500);
});

// 加载触发点文件夹结构
async function loadTriggerPointStructure() {
    try {
        // 使用硬编码的文件列表（可以根据需要修改）
        const files = [
            "胸锁乳突肌锁骨支右.json",
            "胸锁乳突肌锁骨支左.json",
            "胸锁乳突肌胸骨支右.json",
            "胸锁乳突肌胸骨支左.json"
        ];
        
        console.log('Files loaded:', files);
        
        // 构建文件结构
        const structure = {};
        files.forEach(file => {
            structure[file] = "file";
        });
        
        // 直接加载本地文件
        let labelData = [];
        try {
            const labelResponse = await fetch('./static/models/triggerpoint.json');
            if (labelResponse.ok) {
                labelData = await labelResponse.json();
            console.log('Label data loaded:', labelData);
            }
        } catch (error) {
            console.warn('Could not load triggerpoint.json:', error);
        }
        
        displayTreeStructure(structure, labelData);
        
    } catch (error) {
        console.error('Error loading trigger point structure:', error);
        treeContainer.innerHTML = '<div style="color: red;">加载失败: ' + error.message + '</div>';
    }
}

// 显示树状结构
function displayTreeStructure(structure, labelData, level = 0, fullStructure = null, currentFolderName = '') {
    // 在顶层时保存完整结构
    if (level === 0) {
        fullStructure = structure;
    }
    
    let html = level === 0 ? '<div style="font-weight: bold; margin-bottom: 10px;">列表</div>' : '';
    
    // 在顶层添加穴位列表
    if (level === 0) {
        html += '<div style="font-weight: bold; margin-bottom: 10px; margin-top: 15px; cursor: pointer; user-select: none;" onclick="toggleAcupointList()">穴位列表: ▼</div>';
        html += '<div id="acupointListContent" style="display: block;">';
            html += '<input type="text" id="acupointSearch" placeholder="搜索穴位..." style="width: 100%; padding: 5px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 3px;" onkeyup="filterAcupoints()">';
        
        // 读取children.json文件获取子节点列表
        fetch('./static/models/children.json')
            .then(response => response.json())
            .then(childrenData => {
                // 确保childrenData是数组
                const acupointList = Array.isArray(childrenData) ? childrenData : [];
                
                // 读取acupoint.json文件（穴位列表对应acupoint.json）
                fetch('./static/models/acupoint.json')
                    .then(response => response.json())
                    .then(acupointData => {
                        console.log('Acupoint data loaded:', acupointData);
                        
                        // 分离标记和未标记的穴位，并分离已选中和未选中的
                        const markedAcupoints = [];
                        const unmarkedAcupoints = [];
                        const checkedAcupoints = [];
                        const uncheckedAcupoints = [];
                        
                        acupointList.forEach(acupoint => {
                            // 检查穴位是否在acupoint.json中
                            const isInAcupoint = Array.isArray(acupointData) && acupointData.includes(acupoint);
                            const isChecked = loadedPointClouds.has(acupoint);
                            
                            if (isInAcupoint) {
                                if (isChecked) {
                                    checkedAcupoints.push(acupoint);
                                } else {
                                markedAcupoints.push(acupoint);
                                }
                            } else {
                                if (isChecked) {
                                    checkedAcupoints.push(acupoint);
                            } else {
                                unmarkedAcupoints.push(acupoint);
                                }
                            }
                        });
                        
                        // 添加全部取消高亮按钮
                        html += '<button onclick="clearAllHighlights()" style="width: 100%; padding: 8px; margin-bottom: 10px; background-color: #ff6b6b; color: white; border: none; border-radius: 3px; cursor: pointer;">清除所有高亮</button>';
                        
                        // 先显示已选中的穴位（提到顶部）
                        checkedAcupoints.forEach(acupoint => {
                            const isInAcupoint = Array.isArray(acupointData) && acupointData.includes(acupoint);
                            const style = isInAcupoint ? 'color: red; text-decoration: underline;' : '';
                            html += `<div class="acupoint-item" style="margin: 5px 0; padding: 5px; background-color: #e8f5e8; border-radius: 3px; border-left: 3px solid #4CAF50;">
                                <input type="checkbox" id="acupoint_${acupoint}" checked onchange="toggleAcupointHighlight('${acupoint}')" style="margin-right: 5px;">
                                <span style="cursor: pointer; margin-right: 5px;" onclick="focusCameraOnObject('${acupoint}')" title="摄像头对准此穴位">📷</span>
                                <span style="${style}">${acupoint}</span>
                            </div>`;
                        });
                        
                        // 显示标记的穴位
                        markedAcupoints.forEach(acupoint => {
                            html += `<div class="acupoint-item" style="margin: 5px 0; padding: 5px; background-color: #f0f0f0; border-radius: 3px;">
                                <input type="checkbox" id="acupoint_${acupoint}" onchange="toggleAcupointHighlight('${acupoint}')" style="margin-right: 5px;">
                                <span style="cursor: pointer; margin-right: 5px;" onclick="focusCameraOnObject('${acupoint}')" title="摄像头对准此穴位">📷</span>
                                <span style="color: red; text-decoration: underline;">${acupoint}</span>
                            </div>`;
                        });
                        
                        // 显示未标记的穴位
                        unmarkedAcupoints.forEach(acupoint => {
                            html += `<div class="acupoint-item" style="margin: 5px 0; padding: 5px; background-color: #f0f0f0; border-radius: 3px;">
                                <input type="checkbox" id="acupoint_${acupoint}" onchange="toggleAcupointHighlight('${acupoint}')" style="margin-right: 5px;">
                                <span style="cursor: pointer; margin-right: 5px;" onclick="focusCameraOnObject('${acupoint}')" title="摄像头对准此穴位">📷</span>
                                <span>${acupoint}</span>
                            </div>`;
                        });
                        
                        html += '</div>'; // 关闭穴位列表内容div
                        
                        // 继续显示触发点部分
                        html += '<div style="font-weight: bold; margin-bottom: 10px; margin-top: 15px; cursor: pointer; user-select: none;" onclick="toggleTriggerPointList()">触发点列表: ▼</div>';
                        html += '<div id="triggerPointListContent" style="display: block;">';
                        html += '<input type="text" id="triggerPointSearch" placeholder="搜索触发点..." style="width: 100%; padding: 5px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 3px;" onkeyup="filterTriggerPoints()">';
                        
                        // 分离标记和未标记的触发点，并分离已选中和未选中的
                        const markedFiles = [];
                        const unmarkedFiles = [];
                        const checkedFiles = [];
                        const uncheckedFiles = [];
                        
                        for (const [name, content] of Object.entries(structure)) {
                            // 检查文件是否在labelData中
                            const fileName = name.replace('.json', '');
                            const fullName = fileName; // 直接使用文件名，没有文件夹层级
                            
                            // 检查是否在labelData数组中
                            const isLabeled = Array.isArray(labelData) && labelData.includes(fullName);
                            const isChecked = loadedPointClouds.has(fileName);
                            
                            if (isLabeled) {
                                if (isChecked) {
                                    checkedFiles.push({name, fileName});
                                } else {
                                markedFiles.push({name, fileName});
                                }
                            } else {
                                if (isChecked) {
                                    checkedFiles.push({name, fileName});
                            } else {
                                unmarkedFiles.push({name, fileName});
                                }
                            }
                        }
                        
                        // 先显示已选中的触发点（提到顶部）
                        checkedFiles.forEach(file => {
                            const isLabeled = Array.isArray(labelData) && labelData.includes(file.fileName);
                            const style = isLabeled ? 'color: red; text-decoration: underline;' : '';
                            html += `<div class="triggerpoint-item" style="margin: 5px 0; padding: 5px; background-color: #e8f5e8; border-radius: 3px; border-left: 3px solid #4CAF50;">
                                <input type="checkbox" id="checkbox_${file.fileName}" checked onchange="togglePointCloud('${file.fileName}')" style="margin-right: 5px;">
                                <span style="cursor: pointer; margin-right: 5px;" onclick="focusCameraOnObject('${file.fileName}')" title="摄像头对准此触发点">📷</span>
                                <span style="${style}">📄 ${file.name}</span>
                            </div>`;
                        });
                        
                        // 显示标记的触发点（红色+下划线）
                        markedFiles.forEach(file => {
                            html += `<div class="triggerpoint-item" style="margin: 5px 0; padding: 5px; background-color: #f0f0f0; border-radius: 3px;">
                                <input type="checkbox" id="checkbox_${file.fileName}" onchange="togglePointCloud('${file.fileName}')" style="margin-right: 5px;">
                                <span style="cursor: pointer; margin-right: 5px;" onclick="focusCameraOnObject('${file.fileName}')" title="摄像头对准此触发点">📷</span>
                                <span style="color: red; text-decoration: underline;">📄 ${file.name}</span>
                            </div>`;
                        });
                        
                        // 显示未标记的触发点（黑色）
                        unmarkedFiles.forEach(file => {
                            html += `<div class="triggerpoint-item" style="margin: 5px 0; padding: 5px; background-color: #f0f0f0; border-radius: 3px;">
                                <input type="checkbox" id="checkbox_${file.fileName}" onchange="togglePointCloud('${file.fileName}')" style="margin-right: 5px;">
                                <span style="cursor: pointer; margin-right: 5px;" onclick="focusCameraOnObject('${file.fileName}')" title="摄像头对准此触发点">📷</span>
                                <span>📄 ${file.name}</span>
                            </div>`;
                        });
                        
                        html += '</div>'; // 关闭触发点列表内容div
                        
                        treeContainer.innerHTML = html;
                    })
                    .catch(error => {
                        console.error('Error loading acupoint.json:', error);
                        // 如果加载失败，显示默认的穴位列表
                        acupointList.forEach(acupoint => {
                            const isChecked = loadedPointClouds.has(acupoint) ? 'checked' : '';
                            const style = isChecked ? 'background-color: #e8f5e8; border-left: 3px solid #4CAF50;' : 'background-color: #f0f0f0;';
                            html += `<div class="acupoint-item" style="margin: 5px 0; padding: 5px; ${style} border-radius: 3px;">
                                <input type="checkbox" id="acupoint_${acupoint}" ${isChecked} onchange="toggleAcupointHighlight('${acupoint}')" style="margin-right: 5px;">
                                <span style="cursor: pointer; margin-right: 5px;" onclick="focusCameraOnObject('${acupoint}')" title="摄像头对准此穴位">📷</span>
                                <span>📍 ${acupoint}</span>
                            </div>`;
                        });
                        
                        html += '</div>'; // 关闭穴位列表内容div
                        
                        html += '<div style="font-weight: bold; margin-bottom: 10px; margin-top: 15px; cursor: pointer; user-select: none;" onclick="toggleTriggerPointList()">触发点列表: ▼</div>';
                        html += '<div id="triggerPointListContent" style="display: block;">';
                        html += '<input type="text" id="triggerPointSearch" placeholder="搜索触发点..." style="width: 100%; padding: 5px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 3px;" onkeyup="filterTriggerPoints()">';
                        
                        // 分离标记和未标记的触发点，并分离已选中和未选中的
                        const markedFiles = [];
                        const unmarkedFiles = [];
                        const checkedFiles = [];
                        const uncheckedFiles = [];
                        
                        for (const [name, content] of Object.entries(structure)) {
                            // 检查文件是否在labelData中
                            const fileName = name.replace('.json', '');
                            const fullName = fileName; // 直接使用文件名，没有文件夹层级
                            
                            // 检查是否在labelData数组中
                            const isLabeled = Array.isArray(labelData) && labelData.includes(fullName);
                            const isChecked = loadedPointClouds.has(fileName);
                            
                            if (isLabeled) {
                                if (isChecked) {
                                    checkedFiles.push({name, fileName});
                                } else {
                                markedFiles.push({name, fileName});
                                }
                            } else {
                                if (isChecked) {
                                    checkedFiles.push({name, fileName});
                            } else {
                                unmarkedFiles.push({name, fileName});
                                }
                            }
                        }
                        
                        // 先显示已选中的触发点（提到顶部）
                        checkedFiles.forEach(file => {
                            const isLabeled = Array.isArray(labelData) && labelData.includes(file.fileName);
                            const style = isLabeled ? 'color: red; text-decoration: underline;' : '';
                            html += `<div class="triggerpoint-item" style="margin: 5px 0; padding: 5px; background-color: #e8f5e8; border-radius: 3px; border-left: 3px solid #4CAF50;">
                                <input type="checkbox" id="checkbox_${file.fileName}" checked onchange="togglePointCloud('${file.fileName}')" style="margin-right: 5px;">
                                <span style="cursor: pointer; margin-right: 5px;" onclick="focusCameraOnObject('${file.fileName}')" title="摄像头对准此触发点">📷</span>
                                <span style="${style}">📄 ${file.name}</span>
                            </div>`;
                        });
                        
                        // 显示标记的触发点（红色+下划线）
                        markedFiles.forEach(file => {
                            html += `<div class="triggerpoint-item" style="margin: 5px 0; padding: 5px; background-color: #f0f0f0; border-radius: 3px;">
                                <input type="checkbox" id="checkbox_${file.fileName}" onchange="togglePointCloud('${file.fileName}')" style="margin-right: 5px;">
                                <span style="cursor: pointer; margin-right: 5px;" onclick="focusCameraOnObject('${file.fileName}')" title="摄像头对准此触发点">📷</span>
                                <span style="color: red; text-decoration: underline;">📄 ${file.name}</span>
                            </div>`;
                        });
                        
                        // 显示未标记的触发点（黑色）
                        unmarkedFiles.forEach(file => {
                            html += `<div class="triggerpoint-item" style="margin: 5px 0; padding: 5px; background-color: #f0f0f0; border-radius: 3px;">
                                <input type="checkbox" id="checkbox_${file.fileName}" onchange="togglePointCloud('${file.fileName}')" style="margin-right: 5px;">
                                <span style="cursor: pointer; margin-right: 5px;" onclick="focusCameraOnObject('${file.fileName}')" title="摄像头对准此触发点">📷</span>
                                <span>📄 ${file.name}</span>
                            </div>`;
                        });
                        
                        html += '</div>'; // 关闭触发点列表内容div
                        
                        treeContainer.innerHTML = html;
                    });
            })
            .catch(error => {
                console.error('Error loading children.json:', error);
                // 如果加载失败，显示空列表
                html += '<div style="margin-left: 0px; color: #999;">加载失败</div>';
                
                html += '</div>'; // 关闭穴位列表内容div
                
                html += '<div style="font-weight: bold; margin-bottom: 10px; margin-top: 15px; cursor: pointer; user-select: none;" onclick="toggleTriggerPointList()">触发点列表: ▼</div>';
                html += '<div id="triggerPointListContent" style="display: block;">';
                
                // 分离标记和未标记的触发点
                const markedFiles = [];
                const unmarkedFiles = [];
                
                for (const [name, content] of Object.entries(structure)) {
                    // 检查文件是否在labelData中
                    const fileName = name.replace('.json', '');
                    const fullName = fileName; // 直接使用文件名，没有文件夹层级
                    
                    // 检查是否在labelData数组中
                    const isLabeled = Array.isArray(labelData) && labelData.includes(fullName);
                    
                    if (isLabeled) {
                        markedFiles.push({name, fileName});
                    } else {
                        unmarkedFiles.push({name, fileName});
                    }
                }
                
                // 先显示标记的触发点（红色+下划线）
                markedFiles.forEach(file => {
                    const isChecked = loadedPointClouds.has(file.fileName) ? 'checked' : '';
                    html += `<div style="margin: 5px 0; padding: 5px; background-color: #f0f0f0; border-radius: 3px;">
                        <input type="checkbox" id="checkbox_${file.fileName}" ${isChecked} onchange="togglePointCloud('${file.fileName}')" style="margin-right: 5px;">
                        <span style="cursor: pointer; margin-right: 5px;" onclick="focusCameraOnObject('${file.fileName}')" title="摄像头对准此触发点">📷</span>
                        <span style="color: red; text-decoration: underline;">📄 ${file.name}</span>
                    </div>`;
                });
                
                // 再显示未标记的触发点（黑色）
                unmarkedFiles.forEach(file => {
                    const isChecked = loadedPointClouds.has(file.fileName) ? 'checked' : '';
                    html += `<div style="margin: 5px 0; padding: 5px; background-color: #f0f0f0; border-radius: 3px;">
                        <input type="checkbox" id="checkbox_${file.fileName}" ${isChecked} onchange="togglePointCloud('${file.fileName}')" style="margin-right: 5px;">
                        <span style="cursor: pointer; margin-right: 5px;" onclick="focusCameraOnObject('${file.fileName}')" title="摄像头对准此触发点">📷</span>
                        <span>📄 ${file.name}</span>
                    </div>`;
                });
                
                html += '</div>'; // 关闭触发点列表内容div
                
                treeContainer.innerHTML = html;
            });
        
        return; // 提前返回，因为异步处理
    }
    
    // 非顶层的情况，正常递归处理
    for (const [name, content] of Object.entries(structure)) {
        if (typeof content === 'object') {
            html += `<div style="margin-left: ${level * 20}px; color: #0066cc;">📁 ${name}/</div>`;
            html += displayTreeStructure(content, labelData, level + 1, fullStructure, name);
        } else {
            // 检查文件是否在labelData中
            const fileName = name.replace('.json', '');
            const folderName = currentFolderName; // 直接使用当前文件夹名
            const fullName = `${folderName}-${fileName}`;
            
            // 检查是否在labelData数组中
            const isLabeled = Array.isArray(labelData) && labelData.includes(fullName);
            
            html += `<div style="margin-left: ${level * 20}px; color: ${isLabeled ? 'red' : '#333'}; ${isLabeled ? 'text-decoration: underline;' : ''}">
                <input type="checkbox" id="checkbox_${folderName}_${fileName}" onchange="togglePointCloud('${folderName}', '${fileName}')" style="margin-right: 5px;">
                <span style="cursor: pointer; margin-right: 5px;" onclick="focusCameraOnObject('${fileName}')" title="摄像头对准此触发点">📷</span>
                📄 ${name}
            </div>`;
        }
    }
    
    if (level === 0) {
        treeContainer.innerHTML = html;
    } else {
        return html;
    }
}

// 辅助函数：从结构中获取文件夹名
function getFolderNameFromStructure(structure, fileName) {
    for (const [folderName, content] of Object.entries(structure)) {
        if (typeof content === 'object' && fileName in content) {
            return folderName;
        }
    }
    return '';
}

// 存储已加载的点云数据
let loadedPointClouds = new Map();

// 存储高亮信息，用于跟踪每个文件对应的高亮对象
let highlightInfo = new Map(); // key: fileName, value: {objects: [], circles: []}

// 切换点云显示 - 设置为全局函数
window.togglePointCloud = async function(fileName) {
    console.log(`togglePointCloud called with fileName: "${fileName}"`);
    
    const checkbox = document.getElementById(`checkbox_${fileName}`);
    const filePath = `./static/models/triggerpoint/${fileName}.json`;
    
    console.log(`Attempting to toggle point cloud: ${filePath}`);
    
    if (checkbox.checked) {
        // 加载点云数据
        try {
            console.log(`Fetching file: ${filePath}`);
            const response = await fetch(filePath);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const pointData = await response.json();
            console.log(`Successfully loaded ${pointData.length} points from ${filePath}`);
            
            // 创建点云几何体
            const geometry = new THREE.BufferGeometry();
            const positions = [];
            
            pointData.forEach(point => {
                positions.push(point.x, point.y, point.z);
            });
            
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            
            // 创建材质
            const material = new THREE.PointsMaterial({
                color: 0xff0000, // 红色点云
                size: 0.25, // 更大的点
                transparent: true,
                opacity: 0.7 // 更透明
            });
            
            // 创建点云对象
            const pointCloud = new THREE.Points(geometry, material);
            scene.add(pointCloud);
            
            // 存储点云对象
            loadedPointClouds.set(fileName, pointCloud);
            
            console.log(`Successfully added point cloud to scene: ${filePath}`);
            
            // 调用高亮函数
            await highlightObjectsFromFile(fileName);
        } catch (error) {
            console.error(`Error loading point cloud from ${filePath}:`, error);
            checkbox.checked = false; // 取消勾选
        }
    } else {
        // 移除点云数据
        const pointCloud = loadedPointClouds.get(fileName);
        if (pointCloud) {
            scene.remove(pointCloud);
            pointCloud.geometry.dispose();
            pointCloud.material.dispose();
            loadedPointClouds.delete(fileName);
            console.log(`Removed point cloud: ${filePath}`);
        } else {
            console.log(`No point cloud found to remove: ${filePath}`);
        }
        // 调用撤销高亮函数
        removeHighlightForFile(fileName);
    }
}

// 点云数据格式转换函数
function convertToBIN(points) {
    const buffer = new Float32Array(points.length * 3);
    points.forEach((point, index) => {
        buffer[index * 3] = point.x;
        buffer[index * 3 + 1] = point.y;
        buffer[index * 3 + 2] = point.z;
    });
    return buffer.buffer;
}

function convertToPCD(points) {
    let pcd = `# .PCD v0.7 - Point Cloud Data file format
VERSION 0.7
FIELDS x y z
SIZE 4 4 4
TYPE F F F
COUNT 1 1 1
WIDTH ${points.length}
HEIGHT 1
VIEWPOINT 0 0 0 1 0 0 0
POINTS ${points.length}
DATA ascii\n`;
    
    points.forEach(point => {
        pcd += `${point.x} ${point.y} ${point.z}\n`;
    });
    return pcd;
}

function convertToPLY(points) {
    let ply = `ply
format ascii 1.0
element vertex ${points.length}
property float x
property float y
property float z
end_header\n`;
    
    points.forEach(point => {
        ply += `${point.x} ${point.y} ${point.z}\n`;
    });
    return ply;
}

function convertToJSON(points) {
    return JSON.stringify(points.map(point => ({
        x: point.x,
        y: point.y,
        z: point.z
    })), null, 2);
}

// 文件下载函数
function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 修改导出按钮事件处理
exportButton.addEventListener('click', () => {
    if (paintedPoints.length > 0) {
        const pointCloudData = paintedPoints.map(point => ({
            x: point.x,
            y: point.y,
            z: point.z
        }));

        // 创建导出选项菜单
        const exportMenu = document.createElement('div');
        exportMenu.style.position = 'absolute';
        exportMenu.style.top = '50px';
        exportMenu.style.left = '10px';
        exportMenu.style.backgroundColor = 'white';
        exportMenu.style.padding = '10px';
        exportMenu.style.border = '1px solid #ccc';
        exportMenu.style.borderRadius = '5px';
        exportMenu.style.zIndex = '1000';

        const binButton = document.createElement('button');
        binButton.textContent = '导出为BIN';
        binButton.style.marginRight = '5px';
        binButton.onclick = () => {
            const binData = convertToBIN(pointCloudData);
            downloadFile(binData, 'pointcloud.bin', 'application/octet-stream');
            document.body.removeChild(exportMenu);
        };

        const pcdButton = document.createElement('button');
        pcdButton.textContent = '导出为PCD';
        pcdButton.style.marginRight = '5px';
        pcdButton.onclick = () => {
            const pcdData = convertToPCD(pointCloudData);
            downloadFile(pcdData, 'pointcloud.pcd', 'text/plain');
            document.body.removeChild(exportMenu);
        };

        const plyButton = document.createElement('button');
        plyButton.textContent = '导出为PLY';
        plyButton.style.marginRight = '5px';
        plyButton.onclick = () => {
            const plyData = convertToPLY(pointCloudData);
            downloadFile(plyData, 'pointcloud.ply', 'text/plain');
            document.body.removeChild(exportMenu);
        };

        const jsonButton = document.createElement('button');
        jsonButton.textContent = '导出为JSON';
        jsonButton.onclick = () => {
            const jsonData = convertToJSON(pointCloudData);
            downloadFile(jsonData, 'pointcloud.json', 'application/json');
            document.body.removeChild(exportMenu);
        };

        exportMenu.appendChild(binButton);
        exportMenu.appendChild(pcdButton);
        exportMenu.appendChild(plyButton);
        exportMenu.appendChild(jsonButton);
        document.body.appendChild(exportMenu);

        // 点击其他地方关闭菜单
        const closeMenu = (e) => {
            if (!exportMenu.contains(e.target) && e.target !== exportButton) {
                document.body.removeChild(exportMenu);
                document.removeEventListener('click', closeMenu);
            }
        };
        document.addEventListener('click', closeMenu);
    }
});

// 添加事件监听器
renderer.domElement.addEventListener('mousedown', onMouseDown);
renderer.domElement.addEventListener('mousemove', onMouseMove);
renderer.domElement.addEventListener('mouseup', onMouseUp);

// 响应式处理
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// 动画循环
let highlightCircles = [];
let highlightCircleAnimating = false;

const oldAnimate = animate;
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    // 动态圆圈动画
    if (highlightCircleAnimating && highlightCircles.length > 0) {
        const t = performance.now() * 0.002;
        highlightCircles.forEach(c => {
            // 计算圆圈到相机的距离
            const dist = c.mesh.position.distanceTo(camera.position);
            // 设定一个基础像素大小（比如屏幕上约40像素），结合相机参数动态调整scale
            // 这里的40是经验值，可根据实际需求调整
            const desiredScreenSize = 40; // 目标像素
            const vFOV = camera.fov * Math.PI / 180; // 垂直视场角（弧度）
            const heightInWorld = 2 * Math.tan(vFOV / 2) * dist;
            const pixelToWorld = heightInWorld / window.innerHeight;
            const baseScale = desiredScreenSize * pixelToWorld;
            // 扩散动画，scale在1~2之间循环，叠加到基础scale上
            const animScale = 1 + 0.5 * Math.abs(Math.sin(t));
            c.mesh.scale.set(baseScale * animScale, baseScale * animScale, baseScale * animScale);
            c.mesh.material.opacity = 0.7 * (2 - animScale);
            // 保证圆圈始终朝向相机
            c.mesh.lookAt(camera.position);
        });
    }
    renderer.render(scene, camera);
}
animate();

// 添加撤销按钮事件
undoButton.addEventListener('click', undo);

// 添加键盘事件监听
document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key === 'z') {
        event.preventDefault();
        undo();
    }
});

// 读取acupoint.json并高亮和加圆圈 - 提取为通用函数
async function highlightObjectsFromFile(fileName = null) {
    if (!currentModel) return;
    try {
        const res = await fetch('./static/models/acupoint.json');
        if (!res.ok) throw new Error('文件读取失败');
        const list = await res.json();
        if (!Array.isArray(list)) throw new Error('acupoint.json格式错误');
        
        // 如果指定了文件名，只高亮该文件对应的对象
        let objectsToHighlight = list;
        if (fileName) {
            // 首先尝试在acupoint.json中查找
            objectsToHighlight = list.filter(name => {
                // 精确匹配：对象名称必须完全等于文件名
                if (name === fileName) return true;
                
                // 如果精确匹配失败，尝试其他匹配方式
                // 例如：对象名称可能是"左脚_冲阳"，文件名是"冲阳"
                const nameParts = name.split(/[_\-\s]/); // 按下划线、连字符、空格分割
                return nameParts.includes(fileName);
            });
            
            // 如果在acupoint.json中没找到，直接使用文件名
            if (objectsToHighlight.length === 0) {
                objectsToHighlight = [fileName];
            }
        }
        
        // 存储当前文件的高亮信息
        const currentHighlightInfo = {
            objects: [],
            circles: []
        };
        
        // 对每个object高亮并加圆圈
        objectsToHighlight.forEach(name => {
            const obj = currentModel.getObjectByName(name);
            if (obj) {
                // 高亮（变色）
                obj.traverse(child => {
                    if (child.isMesh) {
                        // 保存原始材质
                        if (!originalMaterialsMap.has(child.uuid)) {
                            originalMaterialsMap.set(child.uuid, child.material);
                        }
                        child.material = new THREE.MeshBasicMaterial({color: 0xffff00});
                        currentHighlightInfo.objects.push(child);
                    }
                });
                // 加圆圈
                obj.traverse(child => {
                    if (child.isMesh) {
                        const ringGeo = new THREE.RingGeometry(0.1, 0.15, 64);
                        const ringMat = new THREE.MeshBasicMaterial({
                            color: 0x00bfff,
                            transparent: true,
                            opacity: 1,
                            side: THREE.DoubleSide,
                            depthTest: false
                        });
                        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
                        ringMesh.position.copy(child.getWorldPosition(new THREE.Vector3()));
                        ringMesh.lookAt(camera.position);
                        ringMesh.renderOrder = 999;
                        scene.add(ringMesh);
                        highlightCircles.push({mesh: ringMesh, basePos: ringMesh.position.clone()});
                        currentHighlightInfo.circles.push(ringMesh);
                    }
                });
            }
        });
        
        // 保存高亮信息
        if (fileName) {
            highlightInfo.set(fileName, currentHighlightInfo);
        }
        
        if (highlightCircles.length > 0) {
            highlightCircleAnimating = true;
        }
    } catch (e) {
        alert('读取acupoint.json失败：' + e.message);
    }
}

// 撤销指定文件的高亮
function removeHighlightForFile(fileName) {
    if (!currentModel) return;
    
    try {
        const highlightData = highlightInfo.get(fileName);
        if (!highlightData) {
            console.log(`No highlight data found for file: ${fileName}`);
            return;
        }
        
        // 恢复对象的原始材质
        highlightData.objects.forEach(obj => {
            if (originalMaterialsMap.has(obj.uuid)) {
                obj.material = originalMaterialsMap.get(obj.uuid);
        }
    });
        
        // 移除对应的圆圈
        highlightData.circles.forEach(circle => {
            // 从highlightCircles数组中移除
            const index = highlightCircles.findIndex(c => c.mesh === circle);
            if (index !== -1) {
                highlightCircles.splice(index, 1);
            }
            
            // 从场景中移除
            scene.remove(circle);
            circle.geometry.dispose();
            circle.material.dispose();
        });
        
        // 如果没有圆圈了，停止动画
        if (highlightCircles.length === 0) {
        highlightCircleAnimating = false;
    }
        
        // 删除高亮信息
        highlightInfo.delete(fileName);
        
        console.log(`Removed highlight for file: ${fileName}`);
        
    } catch (e) {
        console.error('撤销高亮失败：', e.message);
    }
}

// 穴位高亮切换函数
window.toggleAcupointHighlight = async function(acupointName) {
    const checkbox = document.getElementById(`acupoint_${acupointName}`);
    
    if (checkbox.checked) {
        // 高亮穴位
        await highlightObjectsFromFile(acupointName);
    } else {
        // 撤销穴位高亮
        removeHighlightForFile(acupointName);
    }
}

// 聚焦相机到指定对象
window.focusCameraOnObject = function(objectName) {
    if (!currentModel) {
        console.warn('模型未加载');
        return;
    }
    
    // 递归查找对象
    function findObjectByName(obj, name) {
        if (obj.name === name) {
            return obj;
        }
        for (const child of obj.children) {
            const found = findObjectByName(child, name);
            if (found) return found;
        }
        return null;
    }
    
    const obj = findObjectByName(currentModel, objectName);
    if (obj) {
        // 获取对象的边界框
        const box = new THREE.Box3().setFromObject(obj);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        // 计算合适的相机距离（基于对象大小）
        const maxSize = Math.max(size.x, size.y, size.z);
        const cameraDistance = Math.max(maxSize * 3, 5); // 至少5个单位距离，确保有足够空间
        
        // 计算相机位置（在对象前方，稍微向上）
        const cameraDirection = new THREE.Vector3(1, 0.3, 1).normalize(); // 稍微向上和侧面的角度
        const cameraPosition = center.clone().add(cameraDirection.multiplyScalar(cameraDistance));
        
        // 设置相机位置和朝向
        camera.position.copy(cameraPosition);
        camera.lookAt(center);
        camera.updateProjectionMatrix();
        
        // 更新控制器目标
        if (controls) {
            controls.target.copy(center);
            controls.update();
        }
        
        console.log(`相机已聚焦到对象: ${objectName}, 距离: ${cameraDistance.toFixed(2)}`);
    } else {
        console.warn('未找到对象: ' + objectName);
        // 尝试模糊匹配并显示建议
        const allObjects = [];
        function collectObjectNames(obj) {
            if (obj.name) allObjects.push(obj.name);
            for (const child of obj.children) {
                collectObjectNames(child);
            }
        }
        collectObjectNames(currentModel);
        const suggestions = allObjects.filter(name => 
            name.toLowerCase().includes(objectName.toLowerCase()) || 
            objectName.toLowerCase().includes(name.toLowerCase())
        );
        if (suggestions.length > 0) {
            console.log('建议的对象:', suggestions);
        } else {
            console.log('所有可用对象:', allObjects);
        }
    }
};

// 穴位列表收起/展开功能
window.toggleAcupointList = function() {
    const content = document.getElementById('acupointListContent');
    const title = event.target;
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        title.textContent = '穴位列表: ▼';
    } else {
        content.style.display = 'none';
        title.textContent = '穴位列表: ▶';
    }
}

// 触发点列表收起/展开功能
window.toggleTriggerPointList = function() {
    const content = document.getElementById('triggerPointListContent');
    const title = event.target;
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        title.textContent = '触发点列表: ▼';
    } else {
        content.style.display = 'none';
        title.textContent = '触发点列表: ▶';
    }
}



// 穴位搜索功能
window.filterAcupoints = function() {
    const searchTerm = document.getElementById('acupointSearch').value.toLowerCase();
    const items = document.querySelectorAll('.acupoint-item');
    
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// 触发点搜索功能
window.filterTriggerPoints = function() {
    const searchTerm = document.getElementById('triggerPointSearch').value.toLowerCase();
    const items = document.querySelectorAll('.triggerpoint-item');
    
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// 全部取消高亮功能
window.clearAllHighlights = function() {
    if (!currentModel) return;
    
    // 清除所有载入的点云
    loadedPointClouds.forEach((pointCloud, fileName) => {
        scene.remove(pointCloud);
        pointCloud.geometry.dispose();
        pointCloud.material.dispose();
        console.log(`Removed point cloud: ${fileName}`);
    });
    loadedPointClouds.clear();
    
    // 清除所有高亮信息
    highlightInfo.clear();
    
    // 恢复所有Mesh为原始材质
    currentModel.traverse(child => {
        if (child.isMesh && originalMaterialsMap.has(child.uuid)) {
            child.material = originalMaterialsMap.get(child.uuid);
        }
    });
    
    // 移除所有高亮圆圈
    if (highlightCircles.length > 0) {
        highlightCircles.forEach(c => {
            scene.remove(c.mesh);
            c.mesh.geometry.dispose();
            c.mesh.material.dispose();
        });
        highlightCircles = [];
        highlightCircleAnimating = false;
    }
    
    // 取消所有复选框的选中状态
    const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
    allCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // 重新加载列表以更新显示
    loadTriggerPointStructure();
    
    console.log('已清除所有高亮和点云');
}
