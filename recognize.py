import os
#import json
import numpy as np
import dezero
from dezero.models import MLP
#import dezero.functions as F
#import plotly.graph_objects as go
#import matplotlib.cm as cm

# -----------------------
# 1. 遍历 data 文件夹获取类别
# -----------------------
def Recognize(point):
    data_dir = 'recognize'
    classes = [os.path.splitext(f)[0] for f in sorted(os.listdir(data_dir)) if f.endswith('.json')]
    num_classes = 50
    
    # 使用 tab10 colormap 动态生成颜色
    #colors = [f'rgb({int(r*255)}, {int(g*255)}, {int(b*255)})'
              #for r, g, b, _ in [cm.get_cmap('tab10')(i) for i in range(num_classes)]]
    
    # -----------------------
    # 2. 装载训练好的模型
    # -----------------------
    hidden_sizes = (256, 128, 64)
    model = MLP(hidden_sizes + (num_classes,))
    model.load_weights('model_weights.npz')
    
    # -----------------------
    # 3. 读取 ask.json
    # -----------------------
    
    ask_array = np.array([[p['x'], p['y'], p['z']] for p in point], dtype=np.float32)
    
    # -----------------------
    # 4. 每点预测
    # -----------------------
    with dezero.no_grad():
        y_pred = model(ask_array)
        pred_class = np.argmax(y_pred.data, axis=1)
    
    # -----------------------
    # 5. 统计类别占比，整体分类
    # -----------------------
    num_points = len(pred_class)
    counts = np.bincount(pred_class, minlength=num_classes)
    ratios = counts / num_points
    
    overall_classes = [classes[idx] for idx, ratio in enumerate(ratios) if ratio >= 0.2]
    if not overall_classes:
        overall_classes.append(classes[np.argmax(ratios)])
    
    overall_label = "，".join(overall_classes)
    
    result = f'\n根据点云，部位识别为: {overall_label}'
    
    with open('Temp-R', 'w', encoding='utf-8') as f:
        f.write(result)
    
    return result



'''
# -----------------------
# 6. 决策边界网格预测
# -----------------------
xx, yy, zz = np.meshgrid(
    np.linspace(ask_array[:,0].min()-0.5, ask_array[:,0].max()+0.5, 20),
    np.linspace(ask_array[:,1].min()-0.5, ask_array[:,1].max()+0.5, 20),
    np.linspace(ask_array[:,2].min()-0.5, ask_array[:,2].max()+0.5, 20)
)
grid = np.c_[xx.ravel(), yy.ravel(), zz.ravel()]
with dezero.no_grad():
    y_grid = model(grid)
    pred_grid = np.argmax(y_grid.data, axis=1)

# -----------------------
# 7. Plotly 3D 可视化
# -----------------------
fig = go.Figure()

# 样本点
for i, cls_name in enumerate(classes):
    mask = pred_class == i
    fig.add_trace(go.Scatter3d(
        x=ask_array[mask,0],
        y=ask_array[mask,1],
        z=ask_array[mask,2],
        mode='markers',
        marker=dict(size=4, color=colors[i]),
        name=cls_name
    ))

# 决策边界网格点
for i in range(num_classes):
    mask = pred_grid == i
    fig.add_trace(go.Scatter3d(
        x=grid[mask,0],
        y=grid[mask,1],
        z=grid[mask,2],
        mode='markers',
        marker=dict(size=2, color=colors[i], opacity=0.2),
        name=f'决策区域 {classes[i]}',
        showlegend=True
    ))

# 整体类别标签
fig.add_trace(go.Scatter3d(
    x=[ask_array[:,0].mean()],
    y=[ask_array[:,1].mean()],
    z=[ask_array[:,2].max()+0.5],
    mode='text',
    text=[f'整体类别: {overall_label}'],
    showlegend=False,
    textfont=dict(size=18, color='black')
))

fig.update_layout(
    scene=dict(
        xaxis_title='X',
        yaxis_title='Y',
        zaxis_title='Z'
    ),
    width=900,
    height=700,
    title='点云分类与决策边界可视化'
)

fig.show(renderer="browser")
'''