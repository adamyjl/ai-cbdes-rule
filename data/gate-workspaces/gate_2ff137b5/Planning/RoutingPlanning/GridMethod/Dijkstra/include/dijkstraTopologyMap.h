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

typedef struct Road {
  int id;
  std::vector<int> successorId;
  std::vector<Lane> lanes;
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
  bool operator<(const Road& other) const { return f > other.f; }
} Road;

typedef struct {
  std::vector<Road> roads;
  void mapAnalysis(const char* mapPath);
  void moduleSelfCheckPrint();
} Map;

typedef struct Astar {
  std::vector<Road> roadList;
  std::priority_queue<Road> openList;
  void initRoad(struct Astar* astar, int number, double xStart, double yStart, double xEnd, double yEnd, double length);
  void initLink(struct Astar* astar, int from, int to);
  void mapToAstar(const Map& m, struct Astar* astar);
  double calcH(int current, int end, Road* roadList);
  Road* findPath(int origin, int destination);
  int getPath(int origin, int destination, std::list<int>* path);
  int findLane(const Map& m, const std::list<int>& path, std::list<std::pair<int, int>>* pathLanes);
  void moduleSelfCheckPrint(const std::list<std::pair<int, int>>& pathLanes);
} Astar;

#endif
