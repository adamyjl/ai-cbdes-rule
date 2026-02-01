

#include <iostream>
#include "../src/lqrFunctional.h"
using namespace std;
using namespace Control;

int main()
{
    // double v = 3;
    // double dt = 0.1;
    // double L = 2.0;
    // Mat A(4, 4);
    // A << 1, dt, 0, 0,
    //      0, 0, v, 0,
    //      0, 0, 1, dt,
    //      0, 0, 0, 0;
    // Mat B(4, 1);
    // B(3) = v / L;
    // Mat Q(4, 4);
    // Q.setIdentity();
    // Mat R(1, 1);
    // R << 1;
    // solveDAREPara para1;
    // solveDAREInput input1{A,B,Q,R};
    // solveDAREOutput output1;
    // solveDARE(para1,input1,output1);
    // dLQRPara para2;
    // dLQRInput input2{A,B,Q,R};
    // dLQROutput output2;
    // dLQR(para2,input2,output2);
    // cout<<"A:"<<endl;
    // cout<<A<<endl;
    // cout<<"B:"<<endl;
    // cout<<B<<endl;
    // cout<<"Q:"<<endl;
    // cout<<Q<<endl;
    // cout<<"R:"<<endl;
    // cout<<R<<endl;
    // cout<<"P:"<<endl;
    // cout<<output1.P<<endl;
    // cout<<"K:"<<endl;
    // cout<<output2.K<<endl;
    State now{1,1,20,3,0};
    TrajPoint p{0,0,10,2,1,1,0};
    Traj tra = {p};
    size_t index =1;
    struct lqrPara para1(2.0,60.0,20.0,0.1);
    struct lqrInput input1{now,tra,index};
    struct lqrOutput output1;
    lqrCalcSteer(para1,input1,output1);
    cout<<output1.delta;
}
