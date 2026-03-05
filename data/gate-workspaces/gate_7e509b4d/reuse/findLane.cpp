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