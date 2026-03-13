#include <iostream>
#include <string>

struct CanvasContext {};

static void node_0(CanvasContext&) { std::cout << "[node] 计算三次样条插值值" << std::endl; }
static void node_1(CanvasContext&) { std::cout << "[node] 获取节点指针" << std::endl; }
static void node_2(CanvasContext&) { std::cout << "[node] ConstructSpline2D" << std::endl; }

int main() {
  CanvasContext ctx;
  node_0(ctx);
  node_1(ctx);
  node_2(ctx);
  return 0;
}