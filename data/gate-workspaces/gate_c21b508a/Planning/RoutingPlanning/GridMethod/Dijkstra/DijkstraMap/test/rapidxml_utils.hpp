#ifndef RAPIDXML_UTILS_HPP_INCLUDED
#define RAPIDXML_UTILS_HPP_INCLUDED

#include "rapidxml.hpp"
#include <vector>
#include <string>
#include <fstream>
#include <stdexcept>

namespace rapidxml {

    template<class Ch = char>
    class file {
    public:
        file(const char* filename) {
            std::ifstream f(filename, std::ios::binary);
            if (!f.is_open()) {
                throw std::runtime_error("file not found");
            }
            f.seekg(0, std::ios::end);
            std::streamoff size = f.tellg();
            f.seekg(0, std::ios::beg);
            m_data.resize(static_cast<std::size_t>(size) + 1);
            f.read(&m_data.front(), static_cast<std::size_t>(size));
            m_data[static_cast<std::size_t>(size)] = 0;
        }

        const Ch* data() const {
            return m_data.data();
        }

        std::size_t size() const {
            return m_data.size();
        }

    private:
        std::vector<Ch> m_data;
    };

}

#endif