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