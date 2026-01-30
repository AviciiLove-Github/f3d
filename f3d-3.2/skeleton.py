def Skeleton(skeleton):
    s = ' 用户摆出以下姿势：'+ skeleton + ' 其中l是左，r是右，如leg_twistl表示左腿扭转，leg_twistr表示右腿扭转'
    with open('Temp-S', 'w', encoding='utf-8') as f:
        f.write(s)
    return skeleton