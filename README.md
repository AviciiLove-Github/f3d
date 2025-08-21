# F3D——flask架构的3d模型查看器

课题项目，基于HuatuoGPT2-7B，这是一个基于Flask的Three.js 3D模型查看器应用，也有和后台的交换数据

## 功能

- **3D模型加载**: 支持GLB格式的3D模型文件
- **穴位高亮**: 支持穴位和触发点的高亮显示
- **相机控制**: 支持模型聚焦和视角控制
- **数据导出**: 支持点云数据的多种格式导出
- **API接口**: 提供与后端相连的API接口
- **处理点云**: 为输入的点云分类
- **AI医生**: 加载医疗模型

## 项目结构

```
f3d/
├── app.py                 # Flask应用主文件
├── compare.py             # 比较功能
├── recognize.py           # 识别部位功能
├── requirements.txt       # Python依赖
├── README.md             # 项目说明
├── templates/            # HTML模板
│   └── index.html       # 主页面模板
├── static/              # 静态文件
│   ├── css/            # 样式文件
│   │   └── style.css   # 主样式文件
│   ├── js/             # JavaScript文件
│   │   └── main.js     # 主逻辑文件
│   └── models/         # 模型文件
│       ├── exDraco.glb # 3D模型文件
│       ├── acupoint.json # 穴位数据
│       ├── children.json # 子节点数据
│       └── triggerpoint/ # 触发点数据
│           ├── label.json
│           └── *.json
```

## 安装和运行

`pip install -r requirements.txt`
`python app.py`

Apache-2.0 license
