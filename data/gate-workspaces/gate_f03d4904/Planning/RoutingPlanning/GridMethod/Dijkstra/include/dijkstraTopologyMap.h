#ifndef DIJKSTRA_TOPOLOGY_MAP_H
#define DIJKSTRA_TOPOLOGY_MAP_H

#include <vector>
#include <list>
#include <queue>
#include <utility>
#include <string>

typedef struct {
  double GaussX;
  double GaussY;
} GaussRoadPoint;

typedef struct {
  int sucRoadID;
  int sucLaneID;
} LaneSuccessorId;

typedef struct {
  int id;
  std::vector<LaneSuccessorId> successorId;
  std::vector<GaussRoadPoint> gaussRoadPoints;
} Lane;

typedef struct {
  int id;
  std::vector<int> successorId;
  std::vector<Lane> lanes;
} Road;

typedef struct {
  std::vector<Road> roads;
} Map;

typedef struct road {
  int id;
  int isInList;
  double xBegin;
  double xEnd;
  double yBegin;
  double yEnd;
  double length;
  std::vector<int> to;
  int father;
  double f;
  double g;
  double h;
  bool operator<(const road& other) const { return f > other.f; }
} road;

extern std::vector<road> roadList;
extern int size;
extern std::priority_queue<road> openList;

typedef struct {
  void initRoad(int number, double xStart, double yStart, double xEnd, double yEnd, double length);
  void initLink(int origin, int destination);
} Astar;

typedef struct { int dummy; } mapToAstarPara;
typedef struct { Map m; } mapToAstarInput;
typedef struct { Astar A; } mapToAstarOutput;
void mapToAstar(mapToAstarPara& para, mapToAstarInput& input, mapToAstarOutput& output);
void mapToAstar(Map m, Astar* as);

typedef struct { int dummy; } getPathPara;
typedef struct { Astar A; int origin; int destination; } getPathInput;
typedef struct { std::list<int> path; } getPathOutput;
void getPath(getPathPara& para, getPathInput& input, getPathOutput& output);
void getPath(int origin, int destination, std::list<int>& path);

typedef struct { int dummy; } findLanePara;
typedef struct { Map m; std::list<int> path; int originRoadId; int originLaneId; int targetRoadId; int targetLaneId; } findLaneInput;
typedef struct { Astar A; } findLaneOutput;
void findLane(findLanePara& para, findLaneInput& input, findLaneOutput& output);
void findLane(Map m, std::list<int> path, std::vector<std::pair<int, int>>& pathLanes);

typedef struct { int dummy; } moduleSelfCheckPrintPara;
typedef struct { Astar A; std::vector<std::pair<int, int>> pathLanes; } moduleSelfCheckPrintInput;
typedef struct { int dummy; } moduleSelfCheckPrintOutput;
void moduleSelfCheckPrint(moduleSelfCheckPrintPara& para, moduleSelfCheckPrintInput& input, moduleSelfCheckPrintOutput& output);

road* findPath(int origin, int destination);

#endif
