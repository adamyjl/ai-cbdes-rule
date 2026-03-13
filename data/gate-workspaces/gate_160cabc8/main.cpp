#include <iostream>
#include <string>

struct CanvasContext {};

static void node_0(CanvasContext&) { std::cout << "[node] main" << std::endl; }
static void node_1(CanvasContext&) { std::cout << "[node] getPath" << std::endl; }
static void node_2(CanvasContext&) { std::cout << "[node] mapAnalysis" << std::endl; }
static void node_3(CanvasContext&) { std::cout << "[node] main" << std::endl; }
static void node_4(CanvasContext&) { std::cout << "[node] findLane" << std::endl; }
static void node_5(CanvasContext&) { std::cout << "[node] initSpeedForTrajectory" << std::endl; }
static void node_6(CanvasContext&) { std::cout << "[node] size" << std::endl; }
static void node_7(CanvasContext&) { std::cout << "[node] getDistance" << std::endl; }
static void node_8(CanvasContext&) { std::cout << "[node] moduleSelfCheckPrint" << std::endl; }
static void node_9(CanvasContext&) { std::cout << "[node] mapToAstar" << std::endl; }
static void node_10(CanvasContext&) { std::cout << "[node] speedModel" << std::endl; }
static void node_11(CanvasContext&) { std::cout << "[node] getMinDistanceOfPoint" << std::endl; }

int main() {
  CanvasContext ctx;
  node_0(ctx);
  node_1(ctx);
  node_2(ctx);
  node_3(ctx);
  node_4(ctx);
  node_5(ctx);
  node_6(ctx);
  node_7(ctx);
  node_8(ctx);
  node_9(ctx);
  node_10(ctx);
  node_11(ctx);
  return 0;
}