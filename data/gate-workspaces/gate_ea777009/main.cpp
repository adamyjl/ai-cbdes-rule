/**
 * @brief 主入口函数，执行拓扑地图路径规划测试
 * @en_name mainEntry
 * @cn_name 主入口
 * @type 函数
 * @param 无
 * @retval int 返回值为0表示成功
 * @granularity 一级函数
 * @tag_level1 路径规划
 * @tag_level2 主程序
 * @version 1.0
 * @date 2023-10-27
 * @author CodeGenerator
 */
int main()
{
    int result = 0;
    
    /* 定义地图分析相关变量 */
    Map mapInstance;
    mapAnalysisPara paraAnalysis;
    mapAnalysisInput inputAnalysis;
    inputAnalysis.path = "./roadMap(1).xodr"; /* 输入地图文件路径 */
    mapAnalysisOutput outputAnalysis;
    outputAnalysis.m = mapInstance;

    /* 执行地图分析 */
    mapAnalysis(paraAnalysis, inputAnalysis, outputAnalysis);

    /* 定义Astar转换相关变量 */
    Astar astarInstance;
    mapToAstarPara paraAstar;
    mapToAstarInput inputAstar;
    inputAstar.m = outputAnalysis.m;
    mapToAstarOutput outputAstar;
    outputAstar.A = astarInstance;

    /* 执行地图到Astar图的转换 */
    mapToAstar(paraAstar, inputAstar, outputAstar);

    /* 定义路径获取相关变量 */
    getPathPara paraPath;
    getPathInput inputPath;
    inputPath.A = outputAstar.A;
    inputPath.origin = 3; /* 起始点ID */
    inputPath.destination = 6; /* 目标点ID */
    getPathOutput outputPath;

    /* 执行路径规划获取路径节点 */
    getPath(paraPath, inputPath, outputPath);

    /* 定义车道查找相关变量 */
    findLanePara paraLane;
    findLaneInput inputLane;
    inputLane.m = outputAnalysis.m;
    inputLane.path = outputPath.path;
    inputLane.originRoad = 3;
    inputLane.originLane = 0;
    inputLane.destRoad = 6;
    inputLane.destLane = 1;
    findLaneOutput outputLane;
    outputLane.A = outputAstar.A;

    /* 执行车道级别路径查找 */
    findLane(paraLane, inputLane, outputLane);

    /* 定义打印相关变量 */
    moduleSelfCheckPrintPara paraPrint;
    moduleSelfCheckPrintInput inputPrint;
    inputPrint.A = outputAstar.A;
    inputPrint.pathLanes = outputAstar.A.pathLanes;
    moduleSelfCheckPrintOutput outputPrint;

    /* 执行路径结果打印 */
    moduleSelfCheckPrint(paraPrint, inputPrint, outputPrint);

    /* 定义速度规划相关变量 */
    TrajSpeedInitParam speedParam;
    speedParam.maxspeed = 15.0; /* 最大速度 m/s */
    speedParam.minspeed = 0.0; /* 最小速度 m/s */
    speedParam.d1 = 50.0; /* 远距离阈值 m */
    speedParam.d2 = 10.0; /* 近距离阈值 m */
    speedParam.predictFrequency = 0.1; /* 预测频率 s */
    
    TrajSpeedInitInput speedInput;
    /* 将拓扑路径转换为轨迹点（此处为模拟生成） */
    int pointCount = 20;
    int i = 0;
    if (pointCount > 0) {
        speedInput.trajectory.planningPoints = (PlanningPoint*)malloc(sizeof(PlanningPoint) * pointCount);
        speedInput.trajectory.count = pointCount;
        for (i = 0; i < pointCount; i = i + 1) {
            speedInput.trajectory.planningPoints[i].x = 0.1 * i * i; /* 模拟X坐标 */
            speedInput.trajectory.planningPoints[i].y = 0.0; /* 模拟Y坐标 */
            speedInput.trajectory.planningPoints[i].theta = 0.0;
            speedInput.trajectory.planningPoints[i].kappa = 0.0;
            speedInput.trajectory.planningPoints[i].s = 0.0;
            speedInput.trajectory.planningPoints[i].l = 0.0;
            speedInput.trajectory.planningPoints[i].dkappa = 0.0;
            speedInput.trajectory.planningPoints[i].v = 0.0;
        }
    }

    /* 初始化障碍物预测（空预测） */
    speedInput.prediction.count = 0;
    speedInput.prediction.objects = NULL;

    TrajSpeedInitOutput speedOutput;

    /* 执行速度初始化 */
    initSpeedForTrajectory(speedParam, speedInput, speedOutput);

    /* 释放动态分配的内存 */
    if (speedInput.trajectory.planningPoints != NULL) {
        free(speedInput.trajectory.planningPoints);
    }

    return result;
}