#include <iostream>

int main() {
  return 0;
}

void initSpeedForTrajectory(const TrajSpeedInitParam &param, const TrajSpeedInitInput &input, TrajSpeedInitOutput &output){
  
  PlanningTrajectory trajectory = input.trajectory;
  prediction::ObjectList prediction = input.prediction;

  int i = 0;
  double t = 0;
  double distance;
  bool stopFlag = false;
  for (i = 0; i < trajectory.planningPoints.size() - 1; i++)
  {
    GetMinObjDisParam param1;
    GetMinObjDisInput input1{
      trajectory.planningPoints[i], 
      prediction, 
      t
    };
    GetMinObjDisOutput output1{0};
    getMinDistanceOfPoint(param1, input1, output1);
    distance = output1.distance;


    SpeedModelParam param2{};
    SpeedModelInput input2{distance};
    SpeedModelOutput output2{0};
    speedModel(param2, input2, output2);
    trajectory.planningPoints[i].v = output2.speed;

    if (trajectory.planningPoints[i].v > 0){
      GetDistanceParam param3;
      GetDistanceInput input3{
        trajectory.planningPoints[i].x,
        trajectory.planningPoints[i].y,
        trajectory.planningPoints[i+1].x,
        trajectory.planningPoints[i+1].y
      };
      GetDistanceOutput output3{0};
      getDistance(param3, input3, output3);

      t += output3.distance / trajectory.planningPoints[i].v;
    }
    else{
      stopFlag = true;
      break;
    }
  }
  if (stopFlag)
  {
    for (; i < trajectory.planningPoints.size(); i++)
    {
      trajectory.planningPoints[i].v = 0;
    }
  }
  else
  {
    trajectory.planningPoints[i].v = trajectory.planningPoints[i-1].v;
  }

  output.globalTrajectory = trajectory;
}

void getDistance(const GetDistanceParam& param, const GetDistanceInput& input, GetDistanceOutput& output){
  double x1 = input.x1;
  double x2 = input.x2;
  double y1 = input.y1;
  double y2 = input.y2;

  output.distance = sqrt(pow(x1 - x2, 2) + pow(y1 - y2, 2));
}

void getMinDistanceOfPoint(const GetMinObjDisParam &param, const GetMinObjDisInput &input, GetMinObjDisOutput &output){
  PlanningPoint point = input.point;
  prediction::ObjectList prediction = input.prediction;
  double t = input.t;

  int index;
  double tRemainder;
  PlanningPoint predictTempPoint;
  std::vector<double> distanceFromObject;
  index = (int)t / param.predictFrequency;
  tRemainder = t - index * param.predictFrequency;

  if (index >= 19){
    output.distance = 100;
    return;
  }


  for (auto object : prediction.object()){
    predictTempPoint.x = object.predictpoint(index).x() * (1 - tRemainder) + object.predictpoint(index + 1).x() * tRemainder;
    predictTempPoint.y = object.predictpoint(index).y() * (1 - tRemainder) + object.predictpoint(index + 1).y() * tRemainder;
    
    GetDistanceParam param4;
    GetDistanceInput input4{
      point.x,
      point.y,
      predictTempPoint.x + object.w() / 2,
      predictTempPoint.y + object.l() / 2
    };
    GetDistanceOutput output4{0};
    getDistance(param4, input4, output4);

    GetDistanceParam param5;
    GetDistanceInput input5{
      point.x,
      point.y,
      predictTempPoint.x - object.w() / 2,
      predictTempPoint.y + object.l() / 2
    };
    GetDistanceOutput output5{0};
    getDistance(param5, input5, output5);

    GetDistanceParam param6;
    GetDistanceInput input6{
      point.x,
      point.y,
      predictTempPoint.x + object.w() / 2,
      predictTempPoint.y - object.l() / 2
    };
    GetDistanceOutput output6{0};
    getDistance(param6, input6, output6);    

    GetDistanceParam param7;
    GetDistanceInput input7{
      point.x,
      point.y,
      predictTempPoint.x - object.w() / 2,
      predictTempPoint.y -object.l() / 2
    };
    GetDistanceOutput output7{0};
    getDistance(param7, input7, output7);

    distanceFromObject.push_back(output4.distance);
    distanceFromObject.push_back(output5.distance);
    distanceFromObject.push_back(output6.distance);
    distanceFromObject.push_back(output7.distance);
  }

  if(distanceFromObject.size() > 0){
    FindMinParam param1;
    FindMinInput input1 = {distanceFromObject};
    FindMinOutput output1 = {0};
    findMin(param1, input1, output1);
    output.distance = output1.flag;

    return;
  }
  else{
    output.distance = 100;
    return;
  } 
}

int main()
{
	// int originRoad = 3;
	// int originLane = 0;
	// int destinationRoad = 6;
	// int destinationLane = 1;
	// vector<pair<int,int>> p;
	// Map m;
	// rmPara para1;
	// rmInput input1{"./roadMap(1).xodr"};
	// rmOutput output1{m};
	Map m;
	mapAnalysisPara para1;
	mapAnalysisInput input1{"./roadMap(1).xodr"};
	mapAnalysisOutput output1{m};
	mapAnalysis(para1,input1,output1);
	mapToAstarPara para2;
	mapToAstarInput input2;
	mapToAstarOutput output2;
	input2.m = output1.m;
	mapToAstar(para2,input2,output2);
	// initRoadPara para3;
	// initRoadInput input3{6,1,2,3,4,sqrt((1 - 2) * (1 - 2) + (3 - 4) * (3 - 4))};
	// initRoadOutput output3;
	// initRoad(para3,input3,output3);
	// initLinkPara para3;
	// initLinkInput input3{1,3};
	// initLinkOutput output3{output2.A};
	// initLink(para3,input3,output3);
	getPathPara para3;
	getPathInput input3{output2.A,3,6};
	getPathOutput output3;
	getPath(para3,input3,output3);
	findLanePara para4;
	findLaneInput input4{output1.m,output3.path,3,0,6,1};
	findLaneOutput output4{output2.A};
	findLane(para4,input4,output4);
	// for(auto pl:output4.A.pathLanes)
	// {
	// 	cout<<"road:"<<pl.first<<" lane:"<<pl.second<<endl;
	// }
	// moduleSelfCheckPara para4;
	// moduleSelfCheckInput input4{output2.A};
	// moduleSelfCheckOutput output4;
	// moduleSelfCheck(para4,input4,output4);
	moduleSelfCheckPrintPara para5;
	moduleSelfCheckPrintInput input5{output2.A,output2.A.pathLanes};
	moduleSelfCheckPrintOutput output5;
	moduleSelfCheckPrint(para5,input5,output5);
	// for(auto p:output3.path)
	// 	cout<<p<<' ';



	// cout<<"from:"<<input3.from<<' '<<"to:";
	// for(auto to:output3.A.roadList[input3.from].to)
	// 	cout<<to<<",";
	// cout<<"xBegin:"<<output3.A.roadList[6].xBegin<<endl
	// <<"xEnd:"<<output3.A.roadList[6].xEnd<<endl
	// <<"yBegin:"<<output3.A.roadList[6].yBegin<<endl
	// <<"yEnd:"<<output3.A.roadList[6].yEnd<<endl
	// <<"length:"<<output3.A.roadList[6].length;
// void initRoad(initRoadPara &para,initRoadInput &input,initRoadOutput &output);

// void initLink(initLinkPara &para,initLinkInput &input,initLinkOutput &output);

// void reset(resetPara &para,resetInput &input,resetOutput &output);

// void moduleSelfCheck(moduleSelfCheckPara &para,moduleSelfCheckInput &input,moduleSelfCheckOutput &output);

// void moduleSelfCheckPrint(moduleSelfCheckPrintPara &para,moduleSelfCheckPrintInput &input,moduleSelfCheckPrintOutput &output);

// void mapToAstar(mapToAstarPara &para,mapToAstarInput &input,mapToAstarOutput &output);

// void findLane(findLanePara &para,findLaneInput &input,findLaneOutput &output);

// void getPath(getPathPara &para,getPathInput &input,getPathOutput &output);
	// mapPrintInput input2{output1.m};
	// mapPrintPara para2;
	// mapPrintOutput output2;
	// moduleSelfCheckPara para3;
	// moduleSelfCheckInput input3;
	// moduleSelfCheckOutput output3;
	// moduleSelfCheck(para3,input3,output3);
	// cout<<"before:"<<endl;
	// cout<<"leftID:"<<endl;
	// for(auto road:output1.m.roads)
	// {
	// 	for(auto lane:road.lanes)
	// 	{
	// 		if(!lane.leftLaneId.empty())
	// 		{
	// 			cout<<"roadID:"<<road.id<<':'<<"laneID:"<<lane.id<<':';
	// 			for(auto id:lane.leftLaneId)
	// 				cout<<id<<' ';
	// 		}
	// 	}
	// }
	// cout<<endl<<"rightID:"<<endl;
	// for(auto road:output1.m.roads)
	// {
	// 	for(auto lane:road.lanes)
	// 	{
	// 		if(!lane.rightLaneId.empty())
	// 		{
	// 			cout<<"roadID:"<<road.id<<':'<<"laneID:"<<lane.id<<':';
	// 			for(auto id:lane.rightLaneId)
	// 				cout<<id<<' ';
	// 		}
	// 	}
	// }	
	// neighborLaneSortPara para3;
	// neighborLaneSortInput input3;
	// neighborLaneSortOutput output3{output1.m};
	// neighborLaneSort(para3,input3,output3);
	// cout<<"after:"<<endl;
	// cout<<"leftID:"<<endl;
	// for(auto road:output1.m.roads)
	// {
	// 	for(auto lane:road.lanes)
	// 	{
	// 		if(!lane.leftLaneId.empty())
	// 		{
	// 			cout<<"roadID:"<<road.id<<':'<<"laneID:"<<lane.id<<':';
	// 			for(auto id:lane.leftLaneId)
	// 				cout<<id<<' ';
	// 		}
	// 	}
	// }
	// cout<<endl<<"rightID:"<<endl;
	// for(auto road:output1.m.roads)
	// {
	// 	for(auto lane:road.lanes)
	// 	{
	// 		if(!lane.rightLaneId.empty())
	// 		{
	// 			cout<<"roadID:"<<road.id<<':'<<"laneID:"<<lane.id<<':';
	// 			for(auto id:lane.rightLaneId)
	// 				cout<<id<<' ';
	// 		}
	// 	}
	// }
	// mapPrint(para2,input2,output2);

	// readMap(para1,input1,output1);

	// dijPara para2;
	// dijInput input2{3,0,6,1};
	// dijOutput output2{p};
	// input2.map.roads = output1.map.roads;
	// getPathDijMap(para2,input2,output2);

	// cout << endl << "* * * 用Astar找到的最短路为 : " << endl;
	// Astar().moduleSelfCheckPrint(output2.path);

}

void Astar::mapToAstar(Map m, Astar* as)
{
	for (auto it = m.roads.begin();it != m.roads.end(); it++)
	{
		int number = it->id;
		double xStart = it->lanes.begin()->gaussRoadPoints.begin()->GaussX;
		double yStart = it->lanes.begin()->gaussRoadPoints.begin()->GaussY;
		double xEnd = it->lanes.begin()->gaussRoadPoints.rbegin()->GaussX;
		double yEnd = it->lanes.begin()->gaussRoadPoints.rbegin()->GaussY;
		double length = sqrt((xStart - xEnd) * (xStart - xEnd) + (yStart - yEnd) * (yStart - yEnd));
		(*as).initRoad(number, xStart, yStart, xEnd, yEnd, length);
		for (auto itSuccessor = it->successorId.begin();itSuccessor != it->successorId.end();itSuccessor++)
		{
			(*as).initLink(number, *itSuccessor);
		}
	}
}

int main(int argc, const char * argv[]) {
  // insert code here...
  std::cout << "Hello, World!\n";
  
  std::vector<PlanningPoint> planningPoints;
  for (int i=0; i < 20; i++){
    PlanningPoint PP{0,0,0,
                     0,0,0,
                     0,0,0,
                     0.1*((double)i*i),0,0, 
                     0,0,0,0,0};
    planningPoints.push_back(PP);
  }

  PlanningTrajectory PT{planningPoints};

  STgraphOptParam param{};

  STgraphOptInput input{PT};

  STgraphOptOutput output{PT};

  STOptimization(param, input, output);

  
  for (int i=0; i < 20; i++){
    std::cout << output.trajectory.planningPoints.at(i).v << std::endl;
  }
  
     
  return 0;
}

std::list<int> Astar::getPath(int origin, int destination)
{
	std::list<int> path;
	if (roadList[origin].isInList == -2)
	{
		cout << "getPath wrong : 出发点的边未被初始化";
		return path;
	}
	if (roadList[destination].isInList == -2)
	{
		cout << "getPath wrong : 目的地的边未被初始化";
		return path;
	}
	cout << "使用A*算法寻找从 " << origin << " 到 " << destination << "的最短路" << endl;
	cout << "已经初始化的边有: ";
	for (int i = 0; i < size; i++) {
		if (roadList[i].isInList == 0)cout << i << " ";
	}
	cout << endl;

	if (origin == destination)
	{
		path.push_back(destination);
		return path;
	}

	road* result = findPath(origin, destination);
	int temp = result->father;
	path.push_back(destination);
	path.push_front(temp);
	while (temp != origin)
	{
		temp = roadList[temp].father;
		path.push_front(temp);
	}
	if (!openList.empty())openList.pop();
	return path;
}

void speedModel(const SpeedModelParam &param, const SpeedModelInput &input, SpeedModelOutput &output){
  double distance = input.distance;
  double maxspeed = param.maxspeed;
  double minspeed = param.minspeed;
  double d1 = param.d1;
  double d2 = param.d2;

  if (distance < 0)
  {
    output.speed = minspeed;
    return;
  }

  if (distance < d2)
  {
    output.speed = minspeed;
    return;
  }
  else if (distance > d1)
  {
    output.speed = maxspeed;
    return;
  }
  else
  {
    output.speed = minspeed + (maxspeed - minspeed) * (distance - d2) / (d1 - d2);
    return;
  }
}

void Astar::findLane(Map m, list<int> path)
{
	auto it = path.begin();
	auto itNext = path.begin();//用两个迭代器表示目前的road和下一个road，寻找目前的road中哪条lane能前往下一条道路的某条lane
	//再看看目前road的那条lane是不是已经在pathLanes中（如果不是说明要更换道路）
	itNext++;
	while (itNext != path.end())
	{
		auto itRoads = m.roads.begin();
		while ((*itRoads).id != *it)itRoads++;//找到*it对应id的Map::Road
		for (auto itLanes = (*itRoads).lanes.begin();itLanes != (*itRoads).lanes.end();itLanes++)//遍历Road的各条Lane
		{
			for (auto itSuccessor = (*itLanes).successorId.begin();itSuccessor != (*itLanes).successorId.end();itSuccessor++)
				//遍历Lane的各个Successor
				if ((*itSuccessor).sucRoadID == *itNext) {//如果有Successor的RoadId为下一个要前往的Road
					if ((*itLanes).id != pathLanes.back().second)
					{
						pathLanes.push_back(make_pair(*it, (*itLanes).id));
						//若该Lane不再pathLanes中就将其加入
					}
					pathLanes.push_back(make_pair(*itNext, (*itSuccessor).sucLaneID));
					goto outloop;
					//加入刚才找到的能到达的下一个Lane
				}
		}
	outloop:
		it++;
		itNext++;
	}
}

void Map::moduleSelfCheckPrint() {
	std::cout << "地图共有" << roads.size() << "条路段" << std::endl;
	for (int i = 0; i < roads.size(); i++)
	{
		std::cout << "路段id：" << roads[i].id << std::endl;
		for (int j = 0; j < roads[i].successorId.size(); j++)
		{
			std::cout << "后继路段id：" << roads[i].successorId[j] << std::endl;
		}
		std::cout << "该路段有" << roads[i].lanes.size()<<"条车道" << std::endl;
		for (int j = 0; j < roads[i].lanes.size(); j++)
		{
			std::cout << "该路段第" << j << "条车道id:"<< roads[i].lanes[j].id << std::endl;
			for (int k = 0; k < roads[i].lanes[j].successorId.size(); k++)
			{
				std::cout << "该路段第" << j << "条车道后继车道:" << roads[i].lanes[j].successorId[k].sucRoadID<<"号路段，"<< roads[i].lanes[j].successorId[k].sucLaneID<<"号车道" << std::endl;
			}
			for (int k = 0; k < roads[i].lanes[j].leftLaneId.size(); k++)
			{
				std::cout << "该路段第" << j << "条车道左相邻车道id:" << roads[i].lanes[j].leftLaneId[k]  << std::endl;
			}
			for (int k = 0; k < roads[i].lanes[j].rightLaneId.size(); k++)
			{
				std::cout << "该路段第" << j << "条车道右相邻车道id:" << roads[i].lanes[j].rightLaneId[k] << std::endl;
			}
			std::cout << "该路段第" << j << "条车道路点数量:" << roads[i].lanes[j].gaussRoadPoints.size() << std::endl;
			//打印地图上所有路点的信息，路点可能比较多
			/*for (int k = 0; k < roads[i].lanes[j].gaussRoadPoints.size(); k++)
			{
				std::cout << "gaussX:" << roads[i].lanes[j].gaussRoadPoints[k].GaussX << ";";
				std::cout << "gaussY:" << roads[i].lanes[j].gaussRoadPoints[k].GaussY << ";";
				std::cout << "yaw:" << roads[i].lanes[j].gaussRoadPoints[k].yaw << ";";
				std::cout << "curvature::" << roads[i].lanes[j].gaussRoadPoints[k].curvature << std::endl;
			}*/
			
		}
	}
}

void Map::mapAnalysis(std::string path) {
	rapidxml::file<> fdoc(path.c_str());
	rapidxml::xml_document<> doc;
	doc.parse<0>(fdoc.data());
	rapidxml::xml_node<>* xmlMap = doc.first_node();
	rapidxml::xml_node<>* xmlRoad = xmlMap->first_node("road");
	while (xmlRoad != NULL)
	{
		Road roadTmp;
		rapidxml::xml_attribute<>* attr;

		int roadid = -1;
		attr = xmlRoad->first_attribute("id");
		if (attr != NULL) { roadid = atoi(attr->value()); }
		roadTmp.id = roadid;

		rapidxml::xml_node<>* xmlSuccessor = xmlRoad->first_node("successor");
		attr = xmlSuccessor->first_attribute("successor_Id");
		while (attr != NULL)
		{
			int successorID = -1;
			successorID = atoi(attr->value());
			roadTmp.successorId.push_back(successorID);
			attr = attr->next_attribute("successor_Id");
		}

		rapidxml::xml_node<>* xmlLanes = xmlRoad->first_node("lanes");
		rapidxml::xml_node<>* xmlLane = xmlLanes->first_node("lane");
		while (xmlLane != NULL)
		{
			Lane laneTmp;


			int laneID = -1;
			attr = xmlLane->first_attribute("id");
			if (attr != NULL) { laneID = atoi(attr->value()); }
			laneTmp.id = laneID;

		
			rapidxml::xml_node<>* xmlLaneSuccessor = xmlLane->first_node("successor");
			while (xmlLaneSuccessor != NULL)
			{
				LaneSuccessorId laneSucID = { -1,-1 };
				attr = xmlLaneSuccessor->first_attribute("successor_roadId");
				if (attr != NULL) { laneSucID.sucRoadID = atoi(attr->value()); }
				attr = xmlLaneSuccessor->first_attribute("successor_laneId");
				if (attr != NULL) { laneSucID.sucLaneID = atoi(attr->value()); }
				laneTmp.successorId.push_back(laneSucID); 
				xmlLaneSuccessor = xmlLaneSuccessor->next_sibling("successor");
			}


			rapidxml::xml_node<>* xmlLeftLaneID = xmlLane->first_node("leftLaneID");
			while (xmlLeftLaneID != NULL)
			{
				int leftLane = -1;
				attr = xmlLeftLaneID->first_attribute("id");
				if (attr != NULL) { leftLane = atoi(attr->value()); }
				laneTmp.leftLaneId.push_back(leftLane);
				xmlLeftLaneID = xmlLeftLaneID->next_sibling("leftLaneID");
			}


			rapidxml::xml_node<>* xmlrightLaneID = xmlLane->first_node("rightLaneID");
			while (xmlrightLaneID != NULL)
			{
				int rightLane = -1;
				attr = xmlrightLaneID->first_attribute("id");
				if (attr != NULL) { rightLane = atoi(attr->value()); }
				laneTmp.rightLaneId.push_back(rightLane);
				xmlrightLaneID = xmlrightLaneID->next_sibling("rightLaneID");
			}


			rapidxml::xml_node<>* xmlRoadPoints = xmlLane->first_node("roadPoints");
			rapidxml::xml_node<>* xmlRoadPoint = xmlRoadPoints->first_node("roadPoint");
			while (xmlRoadPoint != NULL)
			{
				GaussRoadPoint point = { 0.0,0.0,0.0,0.0 };
				attr = xmlRoadPoint->first_attribute("gaussX");
				if (attr != NULL) { point.GaussX = atof(attr->value()); }
				attr = xmlRoadPoint->first_attribute("gaussY");
				if (attr != NULL) { point.GaussY = atof(attr->value()); }
				attr = xmlRoadPoint->first_attribute("yaw");
				if (attr != NULL) { point.yaw = atof(attr->value()); }
				attr = xmlRoadPoint->first_attribute("curvature");
				if (attr != NULL) { point.curvature = atof(attr->value()); }
				laneTmp.gaussRoadPoints.push_back(point);
				xmlRoadPoint = xmlRoadPoint->next_sibling("roadPoint");
			}


			roadTmp.lanes.push_back(laneTmp);
			xmlLane = xmlLane->next_sibling("lane");
		}

		roads.push_back(roadTmp);
		xmlRoad = xmlRoad->next_sibling("road");

	}
	
}

std::size_t size() const
        {
            return m_data.size();
        }