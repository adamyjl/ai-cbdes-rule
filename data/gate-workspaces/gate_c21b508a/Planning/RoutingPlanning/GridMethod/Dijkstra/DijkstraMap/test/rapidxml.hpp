#ifndef RAPIDXML_HPP_INCLUDED
#define RAPIDXML_HPP_INCLUDED

#include <cstddef>
#include <cstdlib>
#include <cstring>
#include <cassert>
#include <stdexcept>

#if !defined(RAPIDXML_PARSE_ERROR)
#define RAPIDXML_PARSE_ERROR(what, where) throw std::runtime_error(what)
#endif

namespace rapidxml {
    template<class Ch = char>
    class xml_node;

    template<class Ch = char>
    class xml_attribute;

    template<class Ch = char>
    class xml_document;

    enum node_type {
        node_document,
        node_element,
        node_data,
        node_cdata,
        node_comment,
        node_declaration,
        node_doctype,
        node_pi
    };

    template<class Ch>
    class xml_base {
    public:
        typedef Ch char_type;

        Ch* name() const {
            return m_name;
        }

        Ch* value() const {
            return m_value;
        }

        std::size_t name_size() const {
            return m_name_size;
        }

        std::size_t value_size() const {
            return m_value_size;
        }

        xml_node<Ch>* parent() const {
            return m_parent;
        }

    protected:
        xml_base()
            : m_name(0)
            , m_value(0)
            , m_parent(0)
            , m_name_size(0)
            , m_value_size(0) {
        }

        Ch* m_name;
        Ch* m_value;
        xml_node<Ch>* m_parent;
        std::size_t m_name_size;
        std::size_t m_value_size;
    };

    template<class Ch>
    class xml_attribute : public xml_base<Ch> {
    public:
        xml_attribute<Ch>* previous_attribute() const {
            return m_prev_attribute;
        }

        xml_attribute<Ch>* next_attribute() const {
            return m_next_attribute;
        }

    private:
        xml_attribute<Ch>* m_prev_attribute;
        xml_attribute<Ch>* m_next_attribute;

        friend class xml_node<Ch>;
    };

    template<class Ch>
    class xml_node : public xml_base<Ch> {
    public:
        typedef xml_node<Ch>* node_ptr;

        node_type type() const {
            return static_cast<node_type>(m_type);
        }

        xml_node<Ch>* first_node() const {
            return m_first_node;
        }

        xml_node<Ch>* first_node(const Ch* name) const {
            if (name) {
                for (xml_node<Ch>* child = m_first_node; child; child = child->next_sibling()) {
                    if (child->name() && std::strcmp(child->name(), name) == 0) {
                        return child;
                    }
                }
                return 0;
            }
            return m_first_node;
        }

        xml_node<Ch>* last_node() const {
            return m_last_node;
        }

        xml_node<Ch>* previous_sibling() const {
            return m_prev_sibling;
        }

        xml_node<Ch>* previous_sibling(const Ch* name) const {
            if (name) {
                for (xml_node<Ch>* sibling = m_prev_sibling; sibling; sibling = sibling->previous_sibling()) {
                    if (sibling->name() && std::strcmp(sibling->name(), name) == 0) {
                        return sibling;
                    }
                }
                return 0;
            }
            return m_prev_sibling;
        }

        xml_node<Ch>* next_sibling() const {
            return m_next_sibling;
        }

        xml_node<Ch>* next_sibling(const Ch* name) const {
            if (name) {
                for (xml_node<Ch>* sibling = m_next_sibling; sibling; sibling = sibling->next_sibling()) {
                    if (sibling->name() && std::strcmp(sibling->name(), name) == 0) {
                        return sibling;
                    }
                }
                return 0;
            }
            return m_next_sibling;
        }

        xml_attribute<Ch>* first_attribute() const {
            return m_first_attribute;
        }

        xml_attribute<Ch>* first_attribute(const Ch* name) const {
            if (name) {
                for (xml_attribute<Ch>* attr = m_first_attribute; attr; attr = attr->next_attribute()) {
                    if (attr->name() && std::strcmp(attr->name(), name) == 0) {
                        return attr;
                    }
                }
                return 0;
            }
            return m_first_attribute;
        }

        xml_attribute<Ch>* last_attribute() const {
            return m_last_attribute;
        }

        void type(node_type type) {
            m_type = type;
        }

        xml_node<Ch>* first_node(const Ch* name, std::size_t name_size) const {
            for (xml_node<Ch>* child = m_first_node; child; child = child->next_sibling()) {
                if (child->name_size() == name_size && std::strncmp(child->name(), name, name_size) == 0) {
                    return child;
                }
            }
            return 0;
        }

    private:
        char m_type;
        xml_node<Ch>* m_first_node;
        xml_node<Ch>* m_last_node;
        xml_node<Ch>* m_prev_sibling;
        xml_node<Ch>* m_next_sibling;
        xml_attribute<Ch>* m_first_attribute;
        xml_attribute<Ch>* m_last_attribute;

        friend class xml_document<Ch>;
    };

    template<class Ch = char>
    class xml_document : public xml_node<Ch> {
    public:
        xml_document() {
            this->m_type = node_document;
        }

        void parse(Ch* text) {
            parse<0>(text);
        }

        template<int Flags>
        void parse(Ch* text) {
            assert(this->m_type == node_document);
            Ch* text_start = text;
            m_start = text;
            m_end = text + std::strlen(text);
            m_memory_size = m_end - m_start;
            this->m_first_node = 0;
            this->m_last_node = 0;
            parse_bom<Flags>(text);
            while (true) {
                Ch* node_text = skip_whitespace<Flags>(text);
                if (node_text >= m_end) {
                    break;
                }
                if (*node_text == Ch('<')) {
                    ++node_text;
                    if (node_text >= m_end) {
                        RAPIDXML_PARSE_ERROR("unexpected end of data", node_text);
                    }
                    if (*node_text == Ch('?')) {
                        ++node_text;
                        parse_pi<Flags>(node_text, 0);
                    }
                    else if (*node_text == Ch('!')) {
                        ++node_text;
                        if (node_text >= m_end) {
                            RAPIDXML_PARSE_ERROR("unexpected end of data", node_text);
                        }
                        if (*node_text == Ch('-') && *(node_text + 1) == Ch('-')) {
                            parse_comment<Flags>(node_text + 2, 0);
                        }
                        else if (*node_text == Ch('[')) {
                            parse_cdata<Flags>(node_text + 1, 0);
                        }
                        else if (*node_text == Ch('D') && *(node_text + 1) == Ch('O') && *(node_text + 2) == Ch('C') && *(node_text + 3) == Ch('T') && *(node_text + 4) == Ch('Y') && *(node_text + 5) == Ch('P') && *(node_text + 6) == Ch('E')) {
                            parse_doctype<Flags>(node_text + 7, 0);
                        }
                        else {
                            RAPIDXML_PARSE_ERROR("expected CDATA, comment or doctype", node_text);
                        }
                    }
                    else {
                        parse_element<Flags>(node_text, 0);
                    }
                }
                else {
                    RAPIDXML_PARSE_ERROR("expected <", node_text);
                }
            }
        }

        void clear() {
            m_start = 0;
            m_end = 0;
            m_memory_size = 0;
            this->m_first_node = 0;
            this->m_last_node = 0;
        }

    private:
        Ch* m_start;
        Ch* m_end;
        std::size_t m_memory_size;

        template<int Flags>
        void parse_bom(Ch*& text) {
            if (m_end - text >= 2 && static_cast<unsigned char>(text[0]) == 0xEF && static_cast<unsigned char>(text[1]) == 0xBB) {
                text = text + 2;
            }
        }

        template<int Flags>
        Ch* skip_whitespace(Ch*& text) {
            while (text < m_end && (*text == Ch(' ') || *text == Ch('\t') || *text == Ch('\r') || *text == Ch('\n'))) {
                text = text + 1;
            }
            return text;
        }

        template<int Flags>
        void parse_element(Ch*& text, xml_node<Ch>* parent) {
            xml_node<Ch>* node = allocate_node(node_element);
            node->parent(parent);
            if (parent) {
                append_node(parent, node);
            }
            text = skip_whitespace<Flags>(text);
            parse_node_name<Flags>(text, node);
            text = skip_whitespace<Flags>(text);
            while (text < m_end && *text != Ch('>') && *text != Ch('/')) {
                parse_attribute<Flags>(text, node);
                text = skip_whitespace<Flags>(text);
            }
            if (text < m_end && *text == Ch('/')) {
                text = text + 1;
                if (text >= m_end || *text != Ch('>')) {
                    RAPIDXML_PARSE_ERROR("expected >", text);
                }
                text = text + 1;
            }
            else {
                if (text >= m_end || *text != Ch('>')) {
                    RAPIDXML_PARSE_ERROR("expected >", text);
                }
                text = text + 1;
                text = skip_whitespace<Flags>(text);
                while (true) {
                    Ch* content_start = text;
                    if (text >= m_end || *text != Ch('<')) {
                        text = text + 1;
                    }
                    else {
                        if (content_start < text) {
                            Ch* content = allocate_string(content_start, text - content_start);
                            node->value(content, text - content_start);
                        }
                        Ch* next_text = text + 1;
                        if (next_text >= m_end) {
                            RAPIDXML_PARSE_ERROR("unexpected end of data", next_text);
                        }
                        if (*next_text == Ch('/')) {
                            next_text = next_text + 1;
                            parse_closing_element_name<Flags>(next_text, node);
                            text = next_text;
                            break;
                        }
                        else {
                            parse_element<Flags>(next_text, node);
                            text = skip_whitespace<Flags>(next_text);
                        }
                    }
                }
            }
        }

        template<int Flags>
        void parse_node_name(Ch*& text, xml_node<Ch>* node) {
            Ch* name_start = text;
            while (text < m_end && *text != Ch(' ') && *text != Ch('\t') && *text != Ch('\r') && *text != Ch('\n') && *text != Ch('/') && *text != Ch('>') && *text != Ch('?')) {
                text = text + 1;
            }
            if (text == name_start) {
                RAPIDXML_PARSE_ERROR("expected element name", text);
            }
            Ch* name = allocate_string(name_start, text - name_start);
            node->name(name, text - name_start);
        }

        template<int Flags>
        void parse_attribute(Ch*& text, xml_node<Ch>* node) {
            xml_attribute<Ch>* attribute = allocate_attribute();
            parse_node_name<Flags>(text, attribute);
            text = skip_whitespace<Flags>(text);
            if (text >= m_end || *text != Ch('=')) {
                RAPIDXML_PARSE_ERROR("expected =", text);
            }
            text = text + 1;
            text = skip_whitespace<Flags>(text);
            if (text >= m_end || (*text != Ch('"') && *text != Ch('\''))) {
                RAPIDXML_PARSE_ERROR("expected \" or '", text);
            }
            Ch quote = *text;
            text = text + 1;
            Ch* value_start = text;
            while (text < m_end && *text != quote) {
                text = text + 1;
            }
            if (text >= m_end) {
                RAPIDXML_PARSE_ERROR("unexpected end of data", text);
            }
            Ch* value = allocate_string(value_start, text - value_start);
            attribute->value(value, text - value_start);
            text = text + 1;
            append_attribute(node, attribute);
        }

        template<int Flags>
        void parse_comment(Ch*& text, xml_node<Ch>* parent) {
            xml_node<Ch>* node = allocate_node(node_comment);
            node->parent(parent);
            if (parent) {
                append_node(parent, node);
            }
            Ch* value_start = text;
            while (text < m_end - 2) {
                if (*text == Ch('-') && *(text + 1) == Ch('-') && *(text + 2) == Ch('>')) {
                    Ch* value = allocate_string(value_start, text - value_start);
                    node->value(value, text - value_start);
                    text = text + 3;
                    return;
                }
                text = text + 1;
            }
            RAPIDXML_PARSE_ERROR("unexpected end of comment", text);
        }

        template<int Flags>
        void parse_cdata(Ch*& text, xml_node<Ch>* parent) {
            xml_node<Ch>* node = allocate_node(node_cdata);
            node->parent(parent);
            if (parent) {
                append_node(parent, node);
            }
            if (text >= m_end || *text != Ch('[')) {
                RAPIDXML_PARSE_ERROR("expected [", text);
            }
            text = text + 1;
            Ch* value_start = text;
            while (text < m_end - 2) {
                if (*text == Ch(']') && *(text + 1) == Ch(']') && *(text + 2) == Ch('>')) {
                    Ch* value = allocate_string(value_start, text - value_start);
                    node->value(value, text - value_start);
                    text = text + 3;
                    return;
                }
                text = text + 1;
            }
            RAPIDXML_PARSE_ERROR("unexpected end of cdata", text);
        }

        template<int Flags>
        void parse_pi(Ch*& text, xml_node<Ch>* parent) {
            xml_node<Ch>* node = allocate_node(node_pi);
            node->parent(parent);
            if (parent) {
                append_node(parent, node);
            }
            parse_node_name<Flags>(text, node);
            text = skip_whitespace<Flags>(text);
            Ch* value_start = text;
            while (text < m_end - 1) {
                if (*text == Ch('?') && *(text + 1) == Ch('>')) {
                    Ch* value = allocate_string(value_start, text - value_start);
                    node->value(value, text - value_start);
                    text = text + 2;
                    return;
                }
                text = text + 1;
            }
            RAPIDXML_PARSE_ERROR("unexpected end of pi", text);
        }

        template<int Flags>
        void parse_doctype(Ch*& text, xml_node<Ch>* parent) {
            xml_node<Ch>* node = allocate_node(node_doctype);
            node->parent(parent);
            if (parent) {
                append_node(parent, node);
            }
            Ch* value_start = text;
            while (text < m_end) {
                if (*text == Ch('>')) {
                    Ch* value = allocate_string(value_start, text - value_start);
                    node->value(value, text - value_start);
                    text = text + 1;
                    return;
                }
                text = text + 1;
            }
            RAPIDXML_PARSE_ERROR("unexpected end of doctype", text);
        }

        template<int Flags>
        void parse_closing_element_name(Ch*& text, xml_node<Ch>* node) {
            Ch* name_start = text;
            while (text < m_end && *text != Ch('>')) {
                text = text + 1;
            }
            if (text >= m_end) {
                RAPIDXML_PARSE_ERROR("unexpected end of data", text);
            }
            std::size_t name_size = text - name_start;
            if (node->name_size() != name_size || std::strncmp(node->name(), name_start, name_size) != 0) {
                RAPIDXML_PARSE_ERROR("closing element name mismatch", text);
            }
            text = text + 1;
        }

        xml_node<Ch>* allocate_node(node_type type) {
            void* memory = allocate_memory(sizeof(xml_node<Ch>));
            xml_node<Ch>* node = new (memory) xml_node<Ch>();
            node->type(type);
            return node;
        }

        xml_attribute<Ch>* allocate_attribute() {
            void* memory = allocate_memory(sizeof(xml_attribute<Ch>));
            return new (memory) xml_attribute<Ch>();
        }

        Ch* allocate_string(const Ch* source, std::size_t size) {
            void* memory = allocate_memory(size + 1);
            std::memcpy(memory, source, size);
            static_cast<Ch*>(memory)[size] = 0;
            return static_cast<Ch*>(memory);
        }

        void* allocate_memory(std::size_t size) {
            return std::malloc(size);
        }

        void append_node(xml_node<Ch>* parent, xml_node<Ch>* child) {
            child->parent(parent);
            if (parent->m_last_node) {
                parent->m_last_node->m_next_sibling = child;
                child->m_prev_sibling = parent->m_last_node;
                parent->m_last_node = child;
            }
            else {
                parent->m_first_node = child;
                parent->m_last_node = child;
            }
        }

        void append_attribute(xml_node<Ch>* node, xml_attribute<Ch>* attr) {
            if (node->m_last_attribute) {
                node->m_last_attribute->m_next_attribute = attr;
                attr->m_prev_attribute = node->m_last_attribute;
                node->m_last_attribute = attr;
            }
            else {
                node->m_first_attribute = attr;
                node->m_last_attribute = attr;
            }
        }
    };
}

#endif