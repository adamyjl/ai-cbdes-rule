#ifndef FUN_TOPOLOGY_PATH_PLANNING_H
#define FUN_TOPOLOGY_PATH_PLANNING_H

#include <iostream>
#include <vector>
#include <list>
#include <cmath>
#include <cstdlib>
#include <cstring>

#include "rapidxml.hpp"

using namespace std;

typedef struct {
    double GaussX; // é«æ¯Xåæ 
    double GaussY; // é«æ¯Yåæ 
    double yaw;    // èªåè§
    double curvature; // æ²ç
} GaussRoadPoint;

typedef struct {
    int sucRoadID; // åç»§éè·¯ID
    int sucLaneID; // åç»§è½¦éID
} LaneSuccessorId;

typedef struct {
    int id;
    vector<int> successorId;
    vector<LaneSuccessorId> leftLaneId;
    vector<LaneSuccessorId> rightLaneId;
    vector<LaneSuccessorId> lanesSuccessorId;
    vector<GaussRoadPoint> gaussRoadPoints;
} Lane;

typedef struct {
    int id;
    vector<int> successorId;
    vector<Lane> lanes;
} Road;

typedef struct {
    vector<Road> roads;
    void mapAnalysis(string path);
    void moduleSelfCheckPrint();
} Map;

typedef struct {
    int id;
    int isInList;
    double xBegin;
    double xEnd;
    double yBegin;
    double yEnd;
    double length;
    vector<int> to;
    int father;
    double F;
    double G;
    double H;
} RoadNode;

typedef struct {
    vector<RoadNode> roadList;
    int size;
    list<int> path;
    vector<pair<int, int>> pathLanes;
    void initRoad(int number, double xStart, double yStart, double xEnd, double yEnd, double length);
    void initLink(int origin, int destination);
    RoadNode* findPath(int origin, int destination);
    void mapToAstar(Map m);
    list<int> getPath(int origin, int destination);
    void findLane(Map m, list<int> path);
} Astar;

typedef struct {
    int dummy;
} mapAnalysisPara;

typedef struct {
    string fileName;
} mapAnalysisInput;

typedef struct {
    Map m;
} mapAnalysisOutput;

void mapAnalysis(mapAnalysisPara &para, mapAnalysisInput &input, mapAnalysisOutput &output);

typedef struct {
    int dummy;
} mapToAstarPara;

typedef struct {
    Map m;
} mapToAstarInput;

typedef struct {
    Astar A;
} mapToAstarOutput;

void mapToAstar(mapToAstarPara &para, mapToAstarInput &input, mapToAstarOutput &output);

typedef struct {
    int dummy;
} getPathPara;

typedef struct {
    Astar A;
    int origin;
    int destination;
} getPathInput;

typedef struct {
    list<int> path;
} getPathOutput;

void getPath(getPathPara &para, getPathInput &input, getPathOutput &output);

typedef struct {
    int dummy;
} findLanePara;

typedef struct {
    Map m;
    list<int> path;
    int originRoad;
    int originLane;
    int destinationRoad;
    int destinationLane;
} findLaneInput;

typedef struct {
    Astar A;
} findLaneOutput;

void findLane(findLanePara &para, findLaneInput &input, findLaneOutput &output);

typedef struct {
    int dummy;
} moduleSelfCheckPrintPara;

typedef struct {
    Astar A;
    vector<pair<int, int>> pathLanes;
} moduleSelfCheckPrintInput;

typedef struct {
    int dummy;
} moduleSelfCheckPrintOutput;

void moduleSelfCheckPrint(moduleSelfCheckPrintPara &para, moduleSelfCheckPrintInput &input, moduleSelfCheckPrintOutput &output);

#endif