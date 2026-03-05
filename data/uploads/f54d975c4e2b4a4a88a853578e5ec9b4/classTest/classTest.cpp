#include <iostream>
#include <string>

using namespace std;
class Animal
{
    public:
//    Animal()
//    {
//        name = "animal";
//    }

    Animal(string newName = "animal"):name(newName)
    {
//        this->name = newName;
    }
    virtual int makeNoise() const
    {
        cout << "noise!" + name<<endl;
        return 0;
    }

    protected:
    string name;
};

class Human : public Animal
{
    public:
        Human(string newName):Animal(newName){
        }
        int makeNoise() const
        {
            cout<< "My name is: " + name << endl;
            return 0;
        }
};


int main()
{
    Animal someAnimal;
    someAnimal.makeNoise();
    Animal sheep("sheep");
    sheep.makeNoise();

    Human student("Dan");
    student.makeNoise();
}

