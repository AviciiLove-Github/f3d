import onnx

model = onnx.load("model.onnx")
onnx.checker.check_model(model)
print("ONNX 模型合法 ✔")