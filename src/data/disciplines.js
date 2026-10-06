// Все дисциплины студента (вкладки). У заполненных — status: 'ready' и массив answers.
// У остальных — status: 'soon' (заглушка «в разработке»), заполнишь позже тем же форматом.
import { oopAnswers } from './oop.js'

export const disciplines = [
  { id: 'xml', name: 'XML технологии', teacher: 'Край Дисана', status: 'ready', answers: xmlAnswers() },
  { id: 'prompt', name: 'Prompt-Engineering для ИИ', teacher: 'Ремизов Г. А.', status: 'soon' },
  { id: 'english', name: 'Английский язык A2+', teacher: '', status: 'soon' },
  { id: 'pm', name: 'Введение в управление проектами', teacher: 'Шукова Л. В.', status: 'soon' },
  { id: 'discrete', name: 'Дискретная математика', teacher: 'Киржинов Р. А.', status: 'soon' },
  { id: 'history', name: 'История', teacher: '', status: 'soon' },
  { id: 'logic', name: 'Мат. логика и теория алгоритмов', teacher: 'Киржинов Р. А.', status: 'soon' },
  { id: 'oop', name: 'ООП на C#', teacher: 'Ремизов Г. А.', status: 'ready', answers: oopAnswers },
  { id: 'htmlcss', name: 'Основы HTML/CSS', teacher: 'Кошеева А. М.', status: 'soon' },
  { id: 'linux', name: 'Основы Linux', teacher: 'Таов А. А.', status: 'soon' },
  { id: 'db', name: 'Основы проектирования БД', teacher: 'Край Дисана', status: 'soon' },
  { id: 'project', name: 'Проектная деятельность', teacher: '', status: 'soon' },
  { id: 'pe', name: 'Физическая культура', teacher: '', status: 'soon' },
  { id: 'math', name: 'Элементы высшей математики', teacher: 'Киржинов Р. А.', status: 'soon' },
]

function xmlAnswers() {
  return [
    {
      id: 'char',
      title: 'Обзор XML технологий — «Создать персонажа»',
      points: null,
      task: 'По примеру из intro.zip составить собственный XML-документ персонажа.',
      files: [
        {
          name: 'character.xml',
          lang: 'xml',
          code: `<?xml version="1.0" encoding="UTF-8"?>
<character>
  <name>Арагорн</name>
  <race>Человек</race>
  <class>Следопыт</class>
  <level>12</level>
  <stats>
    <strength>17</strength>
    <dexterity>15</dexterity>
    <constitution>16</constitution>
    <intelligence>13</intelligence>
  </stats>
  <inventory>
    <item type="weapon">Андуриль</item>
    <item type="armor">Кольчуга</item>
    <item type="misc">Эльфийский плащ</item>
  </inventory>
  <skills>
    <skill>Следопытство</skill>
    <skill>Фехтование</skill>
  </skills>
</character>`,
        },
      ],
    },

    {
      id: 'ns',
      title: 'Правила XML — «XML с помощью префикса xmlns:prefix»',
      points: null,
      task: 'Составить XML с использованием пространств имён через префиксы xmlns:prefix.',
      files: [
        {
          name: 'catalog.xml',
          lang: 'xml',
          code: `<?xml version="1.0" encoding="UTF-8"?>
<c:catalog xmlns:c="http://ithub.ru/catalog"
           xmlns:m="http://ithub.ru/catalog/music"
           xmlns:b="http://ithub.ru/catalog/books">
  <m:item>
    <m:title>The Dark Side of the Moon</m:title>
    <m:artist>Pink Floyd</m:artist>
  </m:item>
  <b:item>
    <b:title>Война и мир</b:title>
    <b:author>Л. Н. Толстой</b:author>
  </b:item>
</c:catalog>`,
        },
      ],
    },

    {
      id: 'dtd',
      title: 'КТ: DTD — «Использование DTD»',
      points: 10,
      task: 'Создать DTD для документа timeTable и валидный ему XML. Проверить на well-formed и DTD valid.',
      files: [
        {
          name: 'timetable.dtd',
          lang: 'dtd',
          code: `<!ELEMENT timeTable (complexes, lessons)>

<!ELEMENT complexes (complex+)>
<!ELEMENT complex (name, address)>
<!ATTLIST complex code ID #REQUIRED>

<!ELEMENT lessons (lesson+)>
<!ELEMENT lesson (date, time)>
<!ATTLIST lesson
    no      CDATA #REQUIRED
    complex IDREF #REQUIRED>

<!ELEMENT name    (#PCDATA)>
<!ELEMENT address (#PCDATA)>
<!ELEMENT date    (#PCDATA)>
<!ELEMENT time    (#PCDATA)>

<!-- Примечание: DTD не умеет требовать «число» для атрибута no,
     поэтому использован тип CDATA. Уникальность code обеспечивает ID,
     ссылка на него в lesson/@complex — тип IDREF. -->`,
        },
        {
          name: 'timetable.xml',
          lang: 'xml',
          code: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE timeTable SYSTEM "timetable.dtd">
<timeTable>
  <complexes>
    <complex code="ku">
      <name>Курская</name>
      <address>Костомаровский пер., 3, Москва</address>
    </complex>
    <complex code="vt">
      <name>ВДНХ Техноград</name>
      <address>пр-т Мира, 119, Москва</address>
    </complex>
  </complexes>
  <lessons>
    <lesson no="1" complex="ku">
      <date>2026-01-19</date>
      <time>10:00</time>
    </lesson>
    <lesson no="2" complex="vt">
      <date>2026-01-23</date>
      <time>17:20</time>
    </lesson>
  </lessons>
</timeTable>`,
        },
      ],
    },

    {
      id: 'xsd',
      title: 'КТ: XML Schema — «Использование XML Schema»',
      points: 20,
      task: 'Создать XML Schema для документа notebook и валидный ей XML.',
      files: [
        {
          name: 'notebook.xsd',
          lang: 'xsd',
          code: `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">

  <xs:simpleType name="phoneType">
    <xs:restriction base="xs:string">
      <xs:pattern value="\\d{3}-\\d{2}-\\d{2}"/>
    </xs:restriction>
  </xs:simpleType>

  <xs:element name="notebook">
    <xs:complexType>
      <xs:sequence>

        <xs:element name="offices">
          <xs:complexType>
            <xs:sequence>
              <xs:element name="office" maxOccurs="unbounded">
                <xs:complexType>
                  <xs:simpleContent>
                    <xs:extension base="xs:string">
                      <xs:attribute name="code" type="xs:string" use="required"/>
                    </xs:extension>
                  </xs:simpleContent>
                </xs:complexType>
              </xs:element>
            </xs:sequence>
          </xs:complexType>
        </xs:element>

        <xs:element name="person" maxOccurs="unbounded">
          <xs:complexType>
            <xs:sequence>
              <xs:element name="name">
                <xs:complexType>
                  <xs:sequence>
                    <xs:element name="first" type="xs:string"/>
                    <xs:element name="surname" type="xs:string"/>
                  </xs:sequence>
                </xs:complexType>
              </xs:element>
              <xs:element name="address">
                <xs:complexType>
                  <xs:all>
                    <xs:element name="city" type="xs:string"/>
                    <xs:element name="street" type="xs:string"/>
                    <xs:element name="index">
                      <xs:simpleType>
                        <xs:restriction base="xs:string">
                          <xs:pattern value="\\d{6}"/>
                        </xs:restriction>
                      </xs:simpleType>
                    </xs:element>
                  </xs:all>
                </xs:complexType>
              </xs:element>
              <xs:element name="phones">
                <xs:complexType>
                  <xs:sequence>
                    <xs:element name="phone" minOccurs="0" maxOccurs="unbounded">
                      <xs:complexType>
                        <xs:simpleContent>
                          <xs:extension base="phoneType">
                            <xs:attribute name="type" use="optional">
                              <xs:simpleType>
                                <xs:restriction base="xs:string">
                                  <xs:enumeration value="work"/>
                                  <xs:enumeration value="home"/>
                                </xs:restriction>
                              </xs:simpleType>
                            </xs:attribute>
                          </xs:extension>
                        </xs:simpleContent>
                      </xs:complexType>
                    </xs:element>
                  </xs:sequence>
                </xs:complexType>
              </xs:element>
            </xs:sequence>
            <xs:attribute name="id" type="xs:string" use="required"/>
            <xs:attribute name="office" type="xs:string" use="required"/>
          </xs:complexType>
        </xs:element>

      </xs:sequence>
    </xs:complexType>

    <!-- Уникальность code у office -->
    <xs:key name="officeCode">
      <xs:selector xpath="offices/office"/>
      <xs:field xpath="@code"/>
    </xs:key>
    <!-- person/@office должен ссылаться на существующий office/@code -->
    <xs:keyref name="personOffice" refer="officeCode">
      <xs:selector xpath="person"/>
      <xs:field xpath="@office"/>
    </xs:keyref>
    <!-- Уникальность id у person -->
    <xs:unique name="personId">
      <xs:selector xpath="person"/>
      <xs:field xpath="@id"/>
    </xs:unique>
  </xs:element>

</xs:schema>`,
        },
        {
          name: 'notebook.xml',
          lang: 'xml',
          code: `<?xml version="1.0" encoding="UTF-8"?>
<notebook xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:noNamespaceSchemaLocation="notebook.xsd">
  <offices>
    <office code="msk">Москва</office>
    <office code="spb">Санкт-Петербург</office>
  </offices>
  <person id="p1" office="msk">
    <name>
      <first>Герман</first>
      <surname>Петров</surname>
    </name>
    <address>
      <city>Москва</city>
      <street>Тверская</street>
      <index>101000</index>
    </address>
    <phones>
      <phone type="work">495-11-22</phone>
      <phone type="home">499-33-44</phone>
    </phones>
  </person>
  <person id="p2" office="spb">
    <name>
      <first>Иван</first>
      <surname>Сидоров</surname>
    </name>
    <address>
      <index>190000</index>
      <street>Невский</street>
      <city>Санкт-Петербург</city>
    </address>
    <phones/>
  </person>
</notebook>`,
        },
      ],
    },

    {
      id: 'xpath',
      title: 'Язык XPath — «Просто домашнее задание»',
      points: null,
      task: 'XSL для timeTable: кол-во занятий по комплексам, по времени (10:00/15:30/17:20), первое и последнее занятие, занятий по DTD, чётные на Курской, нечётные на ВДНХ.',
      files: [
        {
          name: 'xpath-report.xsl',
          lang: 'xslt',
          code: `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="text" encoding="UTF-8"/>

  <xsl:template match="/timeTable">
    <xsl:variable name="ls" select="lessons/lesson"/>
    <xsl:variable name="ku" select="offices/office[name='Курская']/@code"/>
    <xsl:variable name="vt" select="offices/office[starts-with(name,'ВДНХ')]/@code"/>

    <xsl:text>Комплекс Курская: всего занятий </xsl:text>
    <xsl:value-of select="count($ls[@complex=$ku])"/><xsl:text>&#10;</xsl:text>

    <xsl:text>Комплекс ВДНХ: всего занятий </xsl:text>
    <xsl:value-of select="count($ls[@complex=$vt])"/><xsl:text>&#10;</xsl:text>

    <xsl:text>Занятий в 10:00 </xsl:text>
    <xsl:value-of select="count($ls[time='10:00'])"/><xsl:text>&#10;</xsl:text>

    <xsl:text>Занятий в 15:30 </xsl:text>
    <xsl:value-of select="count($ls[time='15:30'])"/><xsl:text>&#10;</xsl:text>

    <xsl:text>Занятий в 17:20 </xsl:text>
    <xsl:value-of select="count($ls[time='17:20'])"/><xsl:text>&#10;</xsl:text>

    <xsl:for-each select="$ls">
      <xsl:sort select="date"/>
      <xsl:if test="position()=1">
        <xsl:text>Первое занятие: </xsl:text>
        <xsl:value-of select="thema"/>
        <xsl:text> состоялось </xsl:text>
        <xsl:value-of select="date"/><xsl:text>&#10;</xsl:text>
      </xsl:if>
      <xsl:if test="position()=last()">
        <xsl:text>Последнее занятие: </xsl:text>
        <xsl:value-of select="thema"/>
        <xsl:text> состоялось </xsl:text>
        <xsl:value-of select="date"/><xsl:text>&#10;</xsl:text>
      </xsl:if>
    </xsl:for-each>

    <xsl:text>Занятий по DTD </xsl:text>
    <xsl:value-of select="count($ls[contains(thema,'DTD')])"/><xsl:text>&#10;</xsl:text>

    <xsl:text>Чётных занятий на Курской </xsl:text>
    <xsl:value-of select="count($ls[@complex=$ku][@no mod 2 = 0])"/><xsl:text>&#10;</xsl:text>

    <xsl:text>Нечётных занятий на ВДНХ </xsl:text>
    <xsl:value-of select="count($ls[@complex=$vt][@no mod 2 = 1])"/><xsl:text>&#10;</xsl:text>
  </xsl:template>
</xsl:stylesheet>`,
        },
      ],
    },

    {
      id: 'nodes',
      title: 'XSL: Создание узлов — «Просто домашнее задание»',
      points: null,
      task: 'Два преобразования items→goods: (1) элементы по имени @name со значением @value + комментарий с их числом; (2) группировка по @name в <group name total> с <item>.',
      files: [
        {
          name: 'nodes-flat.xsl',
          lang: 'xslt',
          code: `<?xml version="1.0" encoding="UTF-8"?>
<!-- Задание 1: плоский список -->
<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="yes"/>

  <xsl:template match="/items">
    <goods>
      <xsl:comment> Всего элементов: <xsl:value-of select="count(element)"/> </xsl:comment>
      <xsl:for-each select="element">
        <xsl:element name="{@name}">
          <xsl:value-of select="@value"/>
        </xsl:element>
      </xsl:for-each>
    </goods>
  </xsl:template>
</xsl:stylesheet>`,
        },
        {
          name: 'nodes-grouped.xsl',
          lang: 'xslt',
          code: `<?xml version="1.0" encoding="UTF-8"?>
<!-- Доп. задание: группировка (метод Мюнха) -->
<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:key name="byName" match="element" use="@name"/>

  <xsl:template match="/items">
    <goods>
      <xsl:for-each select="element[generate-id() = generate-id(key('byName',@name)[1])]">
        <group name="{@name}" total="{count(key('byName',@name))}">
          <xsl:for-each select="key('byName',@name)">
            <item><xsl:value-of select="@value"/></item>
          </xsl:for-each>
        </group>
      </xsl:for-each>
    </goods>
  </xsl:template>
</xsl:stylesheet>`,
        },
      ],
    },

    {
      id: 'controls',
      title: 'XSL: Управление кодом — «Просто домашнее задание»',
      points: null,
      task: 'Преобразовать items (name/value/price) в HTML-таблицу с управляющими конструкциями. Образец — изображение на странице задания; ниже разумный вариант, подгони вёрстку под картинку.',
      files: [
        {
          name: 'controls.xsl',
          lang: 'xslt',
          code: `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>

  <xsl:template match="/items">
    <html>
      <head><title>Прайс-лист</title></head>
      <body>
        <h1>Прайс-лист</h1>
        <table border="1" cellpadding="6" cellspacing="0">
          <tr>
            <th>№</th><th>Категория</th><th>Модель</th><th>Цена, руб.</th>
          </tr>
          <xsl:for-each select="element">
            <xsl:sort select="@price" data-type="number" order="descending"/>
            <tr>
              <xsl:choose>
                <xsl:when test="@price &gt; 20000">
                  <xsl:attribute name="style">background:#ffe0e0</xsl:attribute>
                </xsl:when>
                <xsl:otherwise>
                  <xsl:attribute name="style">background:#e0ffe0</xsl:attribute>
                </xsl:otherwise>
              </xsl:choose>
              <td><xsl:value-of select="position()"/></td>
              <td><xsl:value-of select="@name"/></td>
              <td><xsl:value-of select="@value"/></td>
              <td><xsl:value-of select="@price"/></td>
            </tr>
          </xsl:for-each>
          <tr>
            <td colspan="3"><b>Итого</b></td>
            <td><b><xsl:value-of select="sum(element/@price)"/></b></td>
          </tr>
        </table>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>`,
        },
      ],
    },

    {
      id: 'ktxslt',
      title: 'КТ: XSLT — «Выборка узлов по ключу»',
      points: 30,
      task: 'XSLT→HTML по courses: курсы преподавателя «Борисов И.О.»; курсы с темой XML; курсы Борисова с темой XSLT. Через xsl:key (без ключей −10 баллов).',
      files: [
        {
          name: 'courses-keys.xsl',
          lang: 'xslt',
          code: `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>

  <xsl:key name="byTeacher" match="course" use="teachers/teacher"/>
  <xsl:key name="byKeyword" match="course" use="keywords/keyword"/>

  <xsl:template match="/courses">
    <html>
      <body>
        <h1>Наши курсы</h1>

        <h3>Курсы, которые читает Борисов И.О.</h3>
        <ul>
          <xsl:for-each select="key('byTeacher','Борисов И.О.')">
            <li><xsl:value-of select="title"/></li>
          </xsl:for-each>
        </ul>

        <h3>Курсы, которые используют XML</h3>
        <ul>
          <xsl:for-each select="key('byKeyword','XML')">
            <li><xsl:value-of select="title"/></li>
          </xsl:for-each>
        </ul>

        <h3>Курсы Борисова И.О. с темой XSLT</h3>
        <ul>
          <xsl:for-each select="key('byTeacher','Борисов И.О.')[keywords/keyword='XSLT']">
            <li><xsl:value-of select="title"/></li>
          </xsl:for-each>
        </ul>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>`,
        },
      ],
    },

    {
      id: 'ktfinal',
      title: 'КТ: Итог — «Преобразование xml-документа»',
      points: 40,
      task: 'Из source.xml (xhtml с вложенными комментариями) получить плоский <items> с id/parentid/author. Подсказка — параметры. Файла source.xml нет во вложении, поэтому решение рассчитано на вложенные <div class="comment" author="...">; при другой структуре поправь селекторы.',
      files: [
        {
          name: 'flatten.xsl',
          lang: 'xslt',
          code: `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="yes"/>

  <!-- Старт: обходим только комментарии верхнего уровня, parentid = 0 -->
  <xsl:template match="/">
    <items>
      <xsl:apply-templates
          select="//div[@class='comment'][not(ancestor::div[@class='comment'])]">
        <xsl:with-param name="parentid" select="0"/>
      </xsl:apply-templates>
    </items>
  </xsl:template>

  <xsl:template match="div[@class='comment']">
    <xsl:param name="parentid"/>
    <!-- id = порядковый номер комментария в документе -->
    <xsl:variable name="id"
        select="count(preceding::div[@class='comment'])
                + count(ancestor::div[@class='comment']) + 1"/>

    <item id="{$id}" parentid="{$parentid}" author="{@author}">
      <xsl:value-of select="normalize-space(text())"/>
    </item>

    <!-- рекурсия в дочерние комментарии, передаём текущий id -->
    <xsl:apply-templates select="div[@class='comment']">
      <xsl:with-param name="parentid" select="$id"/>
    </xsl:apply-templates>
  </xsl:template>
</xsl:stylesheet>`,
        },
      ],
    },
  ]
}
