// Ответы по дисциплине «ООП на C#». Код в String.raw`...`, чтобы обратные слэши
// и \n в C#-коде отображались как есть.
const R = String.raw

export const oopAnswers = [
  {
    id: 'oop1',
    title: 'КТ №1 — Привести примеры (абстракция, инкапсуляция, полиморфизм)',
    points: 2,
    task: 'Привести примеры из жизни, иллюстрирующие основные принципы ООП: абстракцию, инкапсуляцию, полиморфизм.',
    files: [
      {
        name: 'примеры.txt',
        lang: 'text',
        code: R`АБСТРАКЦИЯ — выделяем только существенное, скрывая детали.
• Пульт от телевизора: нажимаешь кнопки, не зная, какая электроника внутри.
• Карта метро: показывает станции и пересадки, а не реальную географию.
• Класс «Автомобиль» хранит марку, скорость, цвет — но не число молекул краски.

ИНКАПСУЛЯЦИЯ — доступ к данным только через разрешённые методы.
• Банкомат: до денег в сейфе не добраться напрямую — только через операции
  (ввод PIN, снятие). Внутренний механизм скрыт.
• Капсула лекарства: оболочка защищает содержимое и даёт принимать его правильно.
• В коде: поле balance делаем private, менять его можно только методами
  Deposit()/Withdraw(), которые проверяют корректность суммы.

ПОЛИМОРФИЗМ — одно имя, разное поведение в зависимости от типа.
• Кнопка «играть» работает для музыки, видео и игры — действие одно, реализация разная.
• Метод Draw() у фигур: круг рисует окружность, квадрат — квадрат.
• Животные «издают звук»: кошка мяукает, собака лает, корова мычит —
  вызов один (Voice()), результат зависит от объекта.`,
      },
    ],
  },
  {
    id: 'oop2',
    title: 'КТ №2 — Класс Student (поля Name, Age, Group)',
    points: 2,
    task: 'Создать класс Student с полями Name, Age, Group. Создать несколько объектов и заполнить их поля.',
    files: [
      {
        name: 'Program.cs',
        lang: 'csharp',
        code: R`using System;

class Student
{
    public string Name;
    public int Age;
    public string Group;
}

class Program
{
    static void Main()
    {
        // через инициализатор объекта
        Student s1 = new Student { Name = "Герман", Age = 17, Group = "2ИТП1.9" };

        // через присваивание полей
        Student s2 = new Student();
        s2.Name = "Иван";
        s2.Age = 18;
        s2.Group = "2ИТП1.9";

        Console.WriteLine($"{s1.Name}, {s1.Age} лет, группа {s1.Group}");
        Console.WriteLine($"{s2.Name}, {s2.Age} лет, группа {s2.Group}");
    }
}`,
      },
    ],
  },
  {
    id: 'oop3',
    title: 'КТ №3 — Модификаторы доступа',
    points: 2,
    task: 'Создать класс Student с методами, используя не менее трёх разных модификаторов доступа; пояснить в комментариях выбор каждого.',
    files: [
      {
        name: 'Student.cs',
        lang: 'csharp',
        code: R`class Student
{
    private string name;   // private — внутреннее состояние, прячем от внешнего кода

    // public — часть внешнего интерфейса класса, вызывается откуда угодно
    public void SetName(string value)
    {
        if (IsValid(value)) name = value;
    }

    // private — вспомогательная проверка, нужна только самому классу
    private bool IsValid(string value)
    {
        return !string.IsNullOrWhiteSpace(value);
    }

    // protected — доступно наследникам, но не внешнему коду
    protected string GetName() => name;

    // internal — доступно в пределах той же сборки (проекта)
    internal void Print() => System.Console.WriteLine(name);
}`,
      },
    ],
  },
  {
    id: 'oop4',
    title: 'КТ №4 — Конструктор и деструктор',
    points: 2,
    task: 'Создать класс Student. Создать конструктор и деструктор класса.',
    files: [
      {
        name: 'Program.cs',
        lang: 'csharp',
        code: R`using System;

class Student
{
    public string Name;
    public int Age;

    // конструктор — вызывается при создании объекта
    public Student(string name, int age)
    {
        Name = name;
        Age = age;
        Console.WriteLine($"Создан студент {Name}");
    }

    // деструктор (финализатор) — вызывается сборщиком мусора перед удалением
    ~Student()
    {
        Console.WriteLine($"Удалён студент {Name}");
    }
}

class Program
{
    static void Main()
    {
        Student s = new Student("Герман", 17);
        s = null;
        GC.Collect();                    // форсируем сборку мусора,
        GC.WaitForPendingFinalizers();   // чтобы увидеть работу деструктора
    }
}`,
      },
    ],
  },
  {
    id: 'oop5',
    title: 'КТ №5 — Класс с двумя переменными (вывод, изменение, сумма, максимум)',
    points: 2,
    task: 'Создать класс с двумя переменными. Добавить функции вывода на экран, изменения переменных, нахождения суммы и наибольшего из них.',
    files: [
      {
        name: 'Program.cs',
        lang: 'csharp',
        code: R`using System;

class Pair
{
    private int a;
    private int b;

    public void Set(int x, int y) { a = x; b = y; }   // изменение
    public void Print() => Console.WriteLine($"a = {a}, b = {b}"); // вывод
    public int Sum() => a + b;                          // сумма
    public int Max() => a > b ? a : b;                  // максимум
}

class Program
{
    static void Main()
    {
        Pair p = new Pair();
        p.Set(7, 12);
        p.Print();
        Console.WriteLine("Сумма:    " + p.Sum());
        Console.WriteLine("Максимум: " + p.Max());
    }
}`,
      },
    ],
  },
  {
    id: 'oop6',
    title: 'КТ №6 — Интерфейс «Фигура на плоскости»',
    points: 2,
    task: 'Разработать интерфейс «Фигура на плоскости» (перемещение, поворот, площадь, местоположение). Раскрыть его в классах «Треугольник», «Прямоугольник», «Многоугольник».',
    files: [
      {
        name: 'Figures.cs',
        lang: 'csharp',
        code: R`using System;

struct Point
{
    public double X, Y;
    public Point(double x, double y) { X = x; Y = y; }
}

interface IFigure
{
    void Move(double dx, double dy);   // перемещение
    void Rotate(double angle);         // поворот (градусы)
    double Area();                     // площадь
    Point Location();                  // опорная точка
}

class Rectangle : IFigure
{
    private Point pos;
    private double w, h, angle;
    public Rectangle(Point p, double w, double h) { pos = p; this.w = w; this.h = h; }
    public void Move(double dx, double dy) { pos.X += dx; pos.Y += dy; }
    public void Rotate(double a) { angle += a; }
    public double Area() => w * h;
    public Point Location() => pos;
}

class Triangle : IFigure
{
    private Point pos;
    private double a, b, c, angle;   // длины сторон
    public Triangle(Point p, double a, double b, double c)
    { pos = p; this.a = a; this.b = b; this.c = c; }
    public void Move(double dx, double dy) { pos.X += dx; pos.Y += dy; }
    public void Rotate(double ang) { angle += ang; }
    public double Area()             // формула Герона
    {
        double s = (a + b + c) / 2;
        return Math.Sqrt(s * (s - a) * (s - b) * (s - c));
    }
    public Point Location() => pos;
}

class Polygon : IFigure
{
    private Point pos;
    private Point[] v;
    private double angle;
    public Polygon(Point p, Point[] vertices) { pos = p; v = vertices; }
    public void Move(double dx, double dy) { pos.X += dx; pos.Y += dy; }
    public void Rotate(double a) { angle += a; }
    public double Area()             // формула площади Гаусса (шнуровки)
    {
        double s = 0; int n = v.Length;
        for (int i = 0; i < n; i++)
        {
            Point p1 = v[i], p2 = v[(i + 1) % n];
            s += p1.X * p2.Y - p2.X * p1.Y;
        }
        return Math.Abs(s) / 2;
    }
    public Point Location() => pos;
}

class Program
{
    static void Main()
    {
        IFigure[] figures =
        {
            new Rectangle(new Point(0, 0), 4, 5),
            new Triangle(new Point(1, 1), 3, 4, 5),
            new Polygon(new Point(0, 0), new[]
            {
                new Point(0, 0), new Point(4, 0),
                new Point(4, 3), new Point(0, 3)
            })
        };

        foreach (var f in figures)
        {
            f.Move(1, 1);
            Console.WriteLine($"{f.GetType().Name}: площадь = {f.Area():F2}, " +
                              $"позиция = ({f.Location().X}; {f.Location().Y})");
        }
    }
}`,
      },
    ],
  },
  {
    id: 'oop7',
    title: 'КТ №7 — Структура WORKED',
    points: 2,
    task: 'Описать структуру WORKED (ФИО, должность, год приёма). Ввести массив из 5 структур, вывести фамилии работников, стаж которых превышает введённое значение (иначе сообщение).',
    files: [
      {
        name: 'Program.cs',
        lang: 'csharp',
        code: R`using System;

struct Worked
{
    public string Name;      // фамилия и инициалы
    public string Position;  // должность
    public int Year;         // год поступления на работу
}

class Program
{
    static void Main()
    {
        Worked[] staff = new Worked[5];

        for (int i = 0; i < staff.Length; i++)
        {
            Console.WriteLine($"Сотрудник {i + 1}:");
            Console.Write("  ФИО:        "); staff[i].Name = Console.ReadLine();
            Console.Write("  Должность:  "); staff[i].Position = Console.ReadLine();
            Console.Write("  Год приёма: "); staff[i].Year = int.Parse(Console.ReadLine());
        }

        Console.Write("Введите пороговый стаж (лет): ");
        int limit = int.Parse(Console.ReadLine());
        int now = DateTime.Now.Year;

        bool found = false;
        foreach (var w in staff)
        {
            if (now - w.Year > limit)
            {
                Console.WriteLine(w.Name);
                found = true;
            }
        }

        if (!found)
            Console.WriteLine("Сотрудников с таким стажем нет.");
    }
}`,
      },
    ],
  },
  {
    id: 'oop8',
    title: 'КТ №8 — Что неправильно в коде (обобщения)',
    points: 2,
    task: 'Найти и исправить ошибку: class Instantiator<T> { public T instance; public Instantiator() { instance = new T(); } }',
    files: [
      {
        name: 'Instantiator.cs',
        lang: 'csharp',
        code: R`// Ошибка: нельзя вызвать new T() без ограничения — компилятор не знает,
// что у типа T есть открытый конструктор без параметров (ошибка CS0304).
// Решение: добавить ограничение where T : new().

class Instantiator<T> where T : new()
{
    public T instance;

    public Instantiator()
    {
        instance = new T();   // теперь допустимо
    }
}`,
      },
    ],
  },
  {
    id: 'oop9',
    title: 'КТ №9 — Указатели и ссылки',
    points: 2,
    task: 'Создать переменную a, записать значение, получить адрес ячейки памяти и получить значение, обращаясь по адресу.',
    files: [
      {
        name: 'Program.cs',
        lang: 'csharp',
        code: R`// Требуется включить "Разрешить небезопасный код":
// Свойства проекта → Сборка → Разрешить небезопасный код (AllowUnsafeBlocks).
using System;

class Program
{
    static unsafe void Main()
    {
        int a = 42;          // переменная со значением
        int* p = &a;         // p хранит адрес ячейки памяти переменной a

        Console.WriteLine("Значение a:          " + a);
        Console.WriteLine("Адрес ячейки a:      " + (long)p);  // сам адрес
        Console.WriteLine("Значение по адресу:  " + *p);       // разыменование
    }
}`,
      },
    ],
  },
  {
    id: 'oop10',
    title: 'КТ №10 — Метод максимума двух чисел',
    points: 2,
    task: 'Написать метод, возвращающий наибольшее из двух целых чисел (два параметра). Протестировать.',
    files: [
      {
        name: 'Program.cs',
        lang: 'csharp',
        code: R`using System;

class Program
{
    static int Max(int a, int b) => a > b ? a : b;

    static void Main()
    {
        Console.WriteLine(Max(3, 9));     // 9
        Console.WriteLine(Max(15, 4));    // 15
        Console.WriteLine(Max(-2, -7));   // -2
        Console.WriteLine(Max(5, 5));     // 5
    }
}`,
      },
    ],
  },
  {
    id: 'oop11',
    title: 'КТ №11 — Итоговая: Машина → Грузовик',
    points: 5,
    task: 'Класс «Машина» (марка, число цилиндров, мощность): конструкторы, деструктор, печать. Производный public-класс «Грузовик» с грузоподъёмностью: конструкторы по умолчанию и с параметрами, деструктор, печать, переназначение марки и грузоподъёмности.',
    files: [
      {
        name: 'Program.cs',
        lang: 'csharp',
        code: R`using System;

class Car
{
    private string brand;    // марка (в C# строка — ссылочный тип)
    private int cylinders;   // число цилиндров
    private int power;       // мощность, л.с.

    public Car()                                   // конструктор по умолчанию
    {
        brand = "неизвестно"; cylinders = 4; power = 100;
    }
    public Car(string brand, int cylinders, int power)   // с параметрами
    {
        this.brand = brand; this.cylinders = cylinders; this.power = power;
    }
    ~Car() { Console.WriteLine($"Удаление машины {brand}"); }   // деструктор

    public void SetBrand(string value) => brand = value;       // переназначение марки

    public virtual void Print()
        => Console.WriteLine($"Марка: {brand}, цилиндров: {cylinders}, мощность: {power} л.с.");
}

class Truck : Car                     // public-наследование
{
    private double capacity;          // грузоподъёмность, т

    public Truck() : base() { capacity = 0; }
    public Truck(string brand, int cylinders, int power, double capacity)
        : base(brand, cylinders, power)
    {
        this.capacity = capacity;
    }
    ~Truck() { Console.WriteLine("Удаление грузовика"); }

    public void SetCapacity(double value) => capacity = value; // переназначение грузоподъёмности

    public override void Print()
    {
        base.Print();
        Console.WriteLine($"Грузоподъёмность: {capacity} т");
    }
}

class Program
{
    static void Main()
    {
        Truck t = new Truck("КамАЗ", 8, 400, 12.5);
        t.Print();

        t.SetBrand("МАЗ");
        t.SetCapacity(20);
        Console.WriteLine("--- после изменения ---");
        t.Print();
    }
}`,
      },
    ],
  },

  // ---------- Windows Forms ----------
  {
    id: 'oop12',
    title: 'КТ №12 — Две формы, кнопка перехода',
    points: 2,
    task: 'Создать две формы, на главной — кнопку для перехода на вторую форму. (Проект → Добавить → Форма Windows Forms для Form2; на Form1 разместить Button.)',
    files: [
      {
        name: 'Form1.cs',
        lang: 'csharp',
        code: R`private void button1_Click(object sender, EventArgs e)
{
    Form2 form2 = new Form2();
    form2.Show();        // ShowDialog() — если нужно модальное окно
}`,
      },
    ],
  },
  {
    id: 'oop13',
    title: 'КТ №13 — Главное меню, вывод изображения',
    points: 2,
    task: 'Создать главное меню (MenuStrip); при нажатии пункта меню выводить изображение во второй форме (PictureBox).',
    files: [
      {
        name: 'Form1.cs',
        lang: 'csharp',
        code: R`// Пункт меню на Form1
private void показатьToolStripMenuItem_Click(object sender, EventArgs e)
{
    Form2 f = new Form2();
    f.Show();
}`,
      },
      {
        name: 'Form2.cs',
        lang: 'csharp',
        code: R`// На Form2 — PictureBox pictureBox1
private void Form2_Load(object sender, EventArgs e)
{
    pictureBox1.Image = Image.FromFile(@"C:\images\picture.jpg");
    pictureBox1.SizeMode = PictureBoxSizeMode.Zoom;
}`,
      },
    ],
  },
  {
    id: 'oop14',
    title: 'КТ №14 — TextBox, Label, Button',
    points: 2,
    task: 'Разместить Button, TextBox и Label на форме; по нажатию кнопки выводить введённый текст в Label.',
    files: [
      {
        name: 'Form1.cs',
        lang: 'csharp',
        code: R`private void button1_Click(object sender, EventArgs e)
{
    label1.Text = "Привет, " + textBox1.Text + "!";
}`,
      },
    ],
  },
  {
    id: 'oop15',
    title: 'КТ №15 — 3 формы с вопросами, фокус и активация кнопки',
    points: 2,
    task: 'Приложение из ≥3 форм: на каждой вопрос, ответ в TextBox, кнопки «Проверить» и «Очистить». Кнопка проверки неактивна при запуске; при вводе становится активной и получает фокус.',
    files: [
      {
        name: 'QuestionForm.cs',
        lang: 'csharp',
        code: R`// В дизайнере: btnCheck.Enabled = false

private void textBox1_TextChanged(object sender, EventArgs e)
{
    btnCheck.Enabled = textBox1.Text.Length > 0;
    if (btnCheck.Enabled) btnCheck.Focus();   // фокус на кнопку проверки
}

private void btnCheck_Click(object sender, EventArgs e)
{
    if (textBox1.Text.Trim().ToLower() == "париж")   // правильный ответ
        MessageBox.Show("Верно!");
    else
        MessageBox.Show("Неверно, попробуйте ещё раз.");
}

private void btnClear_Click(object sender, EventArgs e)
{
    textBox1.Clear();
    textBox1.Focus();
}`,
      },
    ],
  },
  {
    id: 'oop16',
    title: 'КТ №16 — Обработчик события и его удаление',
    points: 2,
    task: 'Создать обработчик события загрузки формы, затем удалить его из событий и из кода.',
    files: [
      {
        name: 'Form1.cs',
        lang: 'csharp',
        code: R`// 1) Обработчик создаётся двойным кликом по форме:
private void Form1_Load(object sender, EventArgs e)
{
    MessageBox.Show("Форма загружена");
}

// Среда также добавляет подписку в Form1.Designer.cs:
//     this.Load += new System.EventHandler(this.Form1_Load);

// 2) Чтобы корректно удалить обработчик:
//    - удалить метод Form1_Load (выше);
//    - в Form1.Designer.cs удалить строку подписки this.Load += ...;
//      (или очистить поле "Load" во вкладке "События" окна свойств —
//       студия сама уберёт подписку).`,
      },
    ],
  },
  {
    id: 'oop17',
    title: 'КТ №17 — Тест на RadioButton',
    points: 2,
    task: 'Тест, где у каждого вопроса 4 варианта ответа (RadioButton), выбрать можно только один; вывести, правильно ли ответил ученик.',
    files: [
      {
        name: 'Form1.cs',
        lang: 'csharp',
        code: R`// 4 RadioButton внутри одного GroupBox — они взаимоисключающие автоматически.
private void btnCheck_Click(object sender, EventArgs e)
{
    if (radioButton3.Checked)            // пусть верный ответ — третий
        label1.Text = "Правильно!";
    else
        label1.Text = "Неправильно";
}`,
      },
    ],
  },
  {
    id: 'oop18',
    title: 'КТ №18 — CheckBox и PictureBox',
    points: 2,
    task: 'Приложение, меняющее картинку при выборе CheckBox.',
    files: [
      {
        name: 'Form1.cs',
        lang: 'csharp',
        code: R`private void checkBox1_CheckedChanged(object sender, EventArgs e)
{
    pictureBox1.Image = checkBox1.Checked
        ? Image.FromFile(@"C:\images\on.png")
        : Image.FromFile(@"C:\images\off.png");
    pictureBox1.SizeMode = PictureBoxSizeMode.Zoom;
}`,
      },
    ],
  },
  {
    id: 'oop19',
    title: 'КТ №19 — ComboBox: фигура → изображение',
    points: 2,
    task: 'По выбранной из списка (ComboBox) фигуре выводить её изображение в PictureBox.',
    files: [
      {
        name: 'Form1.cs',
        lang: 'csharp',
        code: R`private void Form1_Load(object sender, EventArgs e)
{
    comboBox1.Items.AddRange(new[] { "Круг", "Квадрат", "Треугольник" });
    comboBox1.DropDownStyle = ComboBoxStyle.DropDownList;
}

private void comboBox1_SelectedIndexChanged(object sender, EventArgs e)
{
    switch (comboBox1.SelectedItem.ToString())
    {
        case "Круг":        pictureBox1.Image = Image.FromFile(@"C:\fig\circle.png");   break;
        case "Квадрат":     pictureBox1.Image = Image.FromFile(@"C:\fig\square.png");   break;
        case "Треугольник": pictureBox1.Image = Image.FromFile(@"C:\fig\triangle.png"); break;
    }
    pictureBox1.SizeMode = PictureBoxSizeMode.Zoom;
}`,
      },
    ],
  },
  {
    id: 'oop20',
    title: 'КТ №20 — Timer «до конца занятия…»',
    points: 2,
    task: 'Приложение, выводящее «до конца занятия осталось … минут» каждые 5 минут.',
    files: [
      {
        name: 'Form1.cs',
        lang: 'csharp',
        code: R`// Timer timer1: Interval = 300000 (5 минут), Enabled = true; Label label1.
private DateTime lessonEnd = DateTime.Today.AddHours(10).AddMinutes(30); // конец пары 10:30

private void timer1_Tick(object sender, EventArgs e)
{
    int minutesLeft = (int)(lessonEnd - DateTime.Now).TotalMinutes;
    label1.Text = minutesLeft > 0
        ? $"До конца занятия осталось {minutesLeft} минут"
        : "Занятие окончено";
}`,
      },
    ],
  },
  {
    id: 'oop21',
    title: 'КТ №21 — DateTimePicker (данные о сотрудниках)',
    points: 2,
    task: 'Приложение для ввода информации о сотрудниках; дату рождения задавать через DateTimePicker или MonthCalendar.',
    files: [
      {
        name: 'Form1.cs',
        lang: 'csharp',
        code: R`// TextBox txtName, DateTimePicker dtpBirth, Button btnAdd, ListBox listBox1
private void btnAdd_Click(object sender, EventArgs e)
{
    string info = $"{txtName.Text} — {dtpBirth.Value:dd.MM.yyyy}";
    listBox1.Items.Add(info);
    txtName.Clear();
    txtName.Focus();
}`,
      },
    ],
  },
  {
    id: 'oop22',
    title: 'КТ №22 — Текстовый редактор (файл)',
    points: 2,
    task: 'Текстовый редактор: загрузка данных из файла, редактирование и выгрузка изменённых данных в файл.',
    files: [
      {
        name: 'Form1.cs',
        lang: 'csharp',
        code: R`using System.IO;

// TextBox textBox1 (Multiline = true), OpenFileDialog, SaveFileDialog
private void btnOpen_Click(object sender, EventArgs e)
{
    if (openFileDialog1.ShowDialog() == DialogResult.OK)
        textBox1.Text = File.ReadAllText(openFileDialog1.FileName);
}

private void btnSave_Click(object sender, EventArgs e)
{
    if (saveFileDialog1.ShowDialog() == DialogResult.OK)
        File.WriteAllText(saveFileDialog1.FileName, textBox1.Text);
}`,
      },
    ],
  },
  {
    id: 'oop23',
    title: 'КТ №23 — Итоговая: рейсы и билеты (List + Dictionary)',
    points: 5,
    task: 'WinForms-приложение: прочитать Flight.txt и Tickets.txt (поля через запятую). Flight → в ListBox и Dictionary; Tickets → в ListBox и List. Вывести рейсы с макс. продолжительностью полёта и число пассажиров, ожидающих вылета в заданный момент.',
    files: [
      {
        name: 'Models.cs',
        lang: 'csharp',
        code: R`class Flight
{
    public int Number;        // номер рейса
    public string Departure;  // пункт отправки
    public int DepartureHour; // время вылета (час)
    public int Seats;         // всего мест
}

class Ticket
{
    public int TicketNo;
    public int FlightNo;
    public int Seat;
    public string DepartDate;
    public string Destination;
    public string ArriveDate;
    public int ArriveHour;    // время прибытия (час)
    public double Price;
    public string SaleTime;
}`,
      },
      {
        name: 'DataLoader.cs',
        lang: 'csharp',
        code: R`using System.Collections.Generic;
using System.Globalization;
using System.IO;

static class DataLoader
{
    public static Dictionary<int, Flight> LoadFlights(string path)
    {
        var dict = new Dictionary<int, Flight>();
        foreach (var line in File.ReadAllLines(path))
        {
            var p = line.Split(',');
            var f = new Flight
            {
                Number        = int.Parse(p[0]),
                Departure     = p[1].Trim(),
                DepartureHour = int.Parse(p[2]),
                Seats         = int.Parse(p[3])
            };
            dict[f.Number] = f;
        }
        return dict;
    }

    public static List<Ticket> LoadTickets(string path)
    {
        var list = new List<Ticket>();
        foreach (var line in File.ReadAllLines(path))
        {
            var p = line.Split(',');
            list.Add(new Ticket
            {
                TicketNo    = int.Parse(p[0]),
                FlightNo    = int.Parse(p[1]),
                Seat        = int.Parse(p[2]),
                DepartDate  = p[3].Trim(),
                Destination = p[4].Trim(),
                ArriveDate  = p[5].Trim(),
                ArriveHour  = int.Parse(p[6]),
                Price       = double.Parse(p[7], CultureInfo.InvariantCulture),
                SaleTime    = p[8].Trim()
            });
        }
        return list;
    }
}`,
      },
      {
        name: 'Form1_usage.cs',
        lang: 'csharp',
        code: R`using System.Linq;

var flights = DataLoader.LoadFlights("Flight.txt");   // Dictionary<int, Flight>
var tickets = DataLoader.LoadTickets("Tickets.txt");  // List<Ticket>

// отображаем в ListBox'ах
listBoxFlights.Items.AddRange(
    flights.Values.Select(f => $"{f.Number} {f.Departure} {f.DepartureHour}:00").ToArray());
listBoxTickets.Items.AddRange(
    tickets.Select(t => $"{t.TicketNo} рейс {t.FlightNo} место {t.Seat}").ToArray());

// 3) рейс(ы) с максимальной продолжительностью полёта
int maxDur = tickets.Max(t => t.ArriveHour - flights[t.FlightNo].DepartureHour);
var longest = tickets
    .Where(t => t.ArriveHour - flights[t.FlightNo].DepartureHour == maxDur)
    .Select(t => t.FlightNo).Distinct();
label1.Text = "Самые долгие рейсы: " + string.Join(", ", longest);

// 4) число пассажиров, ожидающих вылета в момент hour (вылет ещё впереди)
int hour = int.Parse(txtHour.Text);
int waiting = tickets.Count(t => flights[t.FlightNo].DepartureHour > hour);
label2.Text = $"Ожидают вылета: {waiting}";`,
      },
    ],
  },

  // ---------- C# и базы данных ----------
  {
    id: 'oop24',
    title: 'КТ №24 — Создать и заполнить БД',
    points: 2,
    task: 'Создать и заполнить базу данных (по индивидуальному заданию). Пример — таблица товаров.',
    files: [
      {
        name: 'create.sql',
        lang: 'sql',
        code: R`-- Пример: БД "Shop" (SQL Server / LocalDB)
CREATE TABLE Products (
    Id       INT PRIMARY KEY IDENTITY,
    Name     NVARCHAR(100) NOT NULL,
    Price    DECIMAL(10,2) NOT NULL,
    Quantity INT NOT NULL
);

INSERT INTO Products (Name, Price, Quantity) VALUES
('Клавиатура', 1500, 10),
('Мышь',        800, 25),
('Монитор',   12000,  5);`,
      },
    ],
  },
  {
    id: 'oop25',
    title: 'КТ №25 — Приложение C# с использованием БД (подключение)',
    points: 2,
    task: 'Создать приложение на C#, подключить базу данных (ADO.NET, строка подключения).',
    files: [
      {
        name: 'Db.cs',
        lang: 'csharp',
        code: R`using System.Data.SqlClient;

static class Db
{
    // строка подключения к LocalDB
    public const string ConnStr =
        @"Data Source=(localdb)\MSSQLLocalDB;Initial Catalog=Shop;Integrated Security=True";

    // проверка соединения
    public static bool Test()
    {
        using (var conn = new SqlConnection(ConnStr))
        {
            conn.Open();
            return conn.State == System.Data.ConnectionState.Open;
        }
    }
}`,
      },
    ],
  },
  {
    id: 'oop26',
    title: 'КТ №26 — Выгрузка данных на форму',
    points: 2,
    task: 'Вывести данные из таблицы на форму (DataGridView).',
    files: [
      {
        name: 'Form1.cs',
        lang: 'csharp',
        code: R`using System.Data;
using System.Data.SqlClient;

private void LoadData()
{
    using (var conn = new SqlConnection(Db.ConnStr))
    {
        var da = new SqlDataAdapter("SELECT * FROM Products", conn);
        var dt = new DataTable();
        da.Fill(dt);
        dataGridView1.DataSource = dt;
    }
}

private void Form1_Load(object sender, EventArgs e) => LoadData();`,
      },
    ],
  },
  {
    id: 'oop27',
    title: 'КТ №27 — Добавление элемента в БД',
    points: 2,
    task: 'Добавить новый элемент в таблицу базы данных (параметризованный INSERT).',
    files: [
      {
        name: 'Form1.cs',
        lang: 'csharp',
        code: R`private void btnAdd_Click(object sender, EventArgs e)
{
    using (var conn = new SqlConnection(Db.ConnStr))
    {
        conn.Open();
        var cmd = new SqlCommand(
            "INSERT INTO Products (Name, Price, Quantity) VALUES (@n, @p, @q)", conn);
        cmd.Parameters.AddWithValue("@n", txtName.Text);
        cmd.Parameters.AddWithValue("@p", decimal.Parse(txtPrice.Text));
        cmd.Parameters.AddWithValue("@q", int.Parse(txtQty.Text));
        cmd.ExecuteNonQuery();
    }
    LoadData();
}`,
      },
    ],
  },
  {
    id: 'oop28',
    title: 'КТ №28 — Удаление элемента из БД',
    points: 2,
    task: 'Удалить выбранный элемент из таблицы базы данных.',
    files: [
      {
        name: 'Form1.cs',
        lang: 'csharp',
        code: R`private void btnDelete_Click(object sender, EventArgs e)
{
    int id = Convert.ToInt32(dataGridView1.CurrentRow.Cells["Id"].Value);
    using (var conn = new SqlConnection(Db.ConnStr))
    {
        conn.Open();
        var cmd = new SqlCommand("DELETE FROM Products WHERE Id = @id", conn);
        cmd.Parameters.AddWithValue("@id", id);
        cmd.ExecuteNonQuery();
    }
    LoadData();
}`,
      },
    ],
  },
  {
    id: 'oop29',
    title: 'КТ №29 — Редактирование элемента БД',
    points: 2,
    task: 'Изменить выбранный элемент в таблице базы данных (UPDATE).',
    files: [
      {
        name: 'Form1.cs',
        lang: 'csharp',
        code: R`private void btnEdit_Click(object sender, EventArgs e)
{
    int id = Convert.ToInt32(dataGridView1.CurrentRow.Cells["Id"].Value);
    using (var conn = new SqlConnection(Db.ConnStr))
    {
        conn.Open();
        var cmd = new SqlCommand(
            "UPDATE Products SET Name=@n, Price=@p, Quantity=@q WHERE Id=@id", conn);
        cmd.Parameters.AddWithValue("@n", txtName.Text);
        cmd.Parameters.AddWithValue("@p", decimal.Parse(txtPrice.Text));
        cmd.Parameters.AddWithValue("@q", int.Parse(txtQty.Text));
        cmd.Parameters.AddWithValue("@id", id);
        cmd.ExecuteNonQuery();
    }
    LoadData();
}`,
      },
    ],
  },
  {
    id: 'oop30',
    title: 'КТ №30 — Выгрузка данных в файл',
    points: 2,
    task: 'Выгрузить данные из таблицы в файл (например CSV).',
    files: [
      {
        name: 'Form1.cs',
        lang: 'csharp',
        code: R`using System.IO;
using System.Linq;
using System.Text;

private void btnExport_Click(object sender, EventArgs e)
{
    var sb = new StringBuilder();
    foreach (DataGridViewRow row in dataGridView1.Rows)
    {
        if (row.IsNewRow) continue;
        var cells = row.Cells.Cast<DataGridViewCell>().Select(c => c.Value?.ToString());
        sb.AppendLine(string.Join(",", cells));
    }
    File.WriteAllText("export.csv", sb.ToString(), Encoding.UTF8);
    MessageBox.Show("Данные выгружены в export.csv");
}`,
      },
    ],
  },
  {
    id: 'oop31',
    title: 'КТ №31 — Поиск по запросу',
    points: 2,
    task: 'Создать поиск элемента(ов) по определённому запросу (фильтр по подстроке).',
    files: [
      {
        name: 'Form1.cs',
        lang: 'csharp',
        code: R`private void txtSearch_TextChanged(object sender, EventArgs e)
{
    using (var conn = new SqlConnection(Db.ConnStr))
    {
        var da = new SqlDataAdapter("SELECT * FROM Products WHERE Name LIKE @q", conn);
        da.SelectCommand.Parameters.AddWithValue("@q", "%" + txtSearch.Text + "%");
        var dt = new DataTable();
        da.Fill(dt);
        dataGridView1.DataSource = dt;
    }
}`,
      },
    ],
  },
  {
    id: 'oop32',
    title: 'КТ №32 — Итоговая по БД (CRUD-приложение)',
    points: 5,
    task: 'Создать БД, привязать к проекту, реализовать добавление/удаление/редактирование через отдельную форму, сделать таблицу недоступной для редактирования в режиме сетки, автоматический расчёт по формуле, отчёты по колонке «Поиск», дружественный интерфейс.',
    files: [
      {
        name: 'MainForm.cs',
        lang: 'csharp',
        code: R`// Итоговое приложение объединяет КТ №24–31.

// 1) Сетка только для чтения (правка — только через отдельную форму):
private void SetupGrid()
{
    dataGridView1.ReadOnly = true;
    dataGridView1.AllowUserToAddRows = false;
    dataGridView1.EditMode = DataGridViewEditMode.EditProgrammatically;
    dataGridView1.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
}

// 2) Добавление/редактирование через дополнительную форму:
private void btnAdd_Click(object sender, EventArgs e)
{
    using (var f = new EditForm())           // отдельная форма ввода
        if (f.ShowDialog() == DialogResult.OK)
            LoadData();
}

// 3) Автоматический расчёт по формуле (итоговая стоимость = цена * кол-во):
private void Recalc()
{
    decimal total = 0;
    foreach (DataGridViewRow r in dataGridView1.Rows)
        if (!r.IsNewRow)
            total += Convert.ToDecimal(r.Cells["Price"].Value)
                   * Convert.ToInt32(r.Cells["Quantity"].Value);
    lblTotal.Text = $"Итого на складе: {total:C}";
}

// 4) Отчёт по колонке "Поиск" — фильтр LIKE, см. КТ №31.
// 5) Дружественный интерфейс: валидация ввода в EditForm (TryParse,
//    маски, подсказки) — чтобы пользователь вводил данные корректно.`,
      },
    ],
  },

  // ---------- Итоговая по предмету ----------
  {
    id: 'oopFinal',
    title: 'Итоговая по предмету — Индивидуальное задание',
    points: 27,
    task: 'Выбрать один из примерных вариантов (полином; предметный указатель; каталог библиотеки; записная книжка; и т.п.) и реализовать класс с полным набором операций. Ниже — вариант «Каталог библиотеки».',
    files: [
      {
        name: 'варианты.txt',
        lang: 'text',
        code: R`Примерные варианты итогового задания:
1. «Полином» — коэффициенты в списке; ввод-вывод, сложение, умножение,
   умножение на число, интегрирование, дифференцирование.
2. «Предметный указатель» — слово + номера страниц; ввод с клавиатуры и из файла,
   печать, сохранение, вывод страниц по слову, добавление/удаление.
3. «Каталог библиотеки» — книга (название, автор, всего экз., на руках);
   формирование каталога, выдача/возврат, поиск, сохранение в файл. (реализовано ниже)`,
      },
      {
        name: 'Library.cs',
        lang: 'csharp',
        code: R`using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

class Book
{
    public string Title;
    public string Author;
    public int Total;       // всего экземпляров
    public int OnHands;     // на руках
    public int Available => Total - OnHands;  // свободно

    public override string ToString()
        => $"{Title} — {Author}; всего {Total}, на руках {OnHands}, свободно {Available}";
}

class Catalog
{
    private List<Book> books = new List<Book>();

    public void Add(Book b) => books.Add(b);
    public void Remove(string title) => books.RemoveAll(b => b.Title == title);
    public void Print() { foreach (var b in books) Console.WriteLine(b); }

    public Book Find(string title) => books.FirstOrDefault(b => b.Title == title);
    public IEnumerable<Book> Available() => books.Where(b => b.Available > 0);

    // выдать книгу читателю
    public bool GiveOut(string title)
    {
        var b = Find(title);
        if (b != null && b.Available > 0) { b.OnHands++; return true; }
        return false;
    }

    // вернуть книгу
    public bool Return(string title)
    {
        var b = Find(title);
        if (b != null && b.OnHands > 0) { b.OnHands--; return true; }
        return false;
    }

    public void Save(string path)
        => File.WriteAllLines(path, books.Select(b => $"{b.Title},{b.Author},{b.Total},{b.OnHands}"));

    public void Load(string path)
        => books = File.ReadAllLines(path).Select(l =>
        {
            var p = l.Split(',');
            return new Book { Title = p[0], Author = p[1], Total = int.Parse(p[2]), OnHands = int.Parse(p[3]) };
        }).ToList();
}

class Program
{
    static void Main()
    {
        var cat = new Catalog();
        cat.Add(new Book { Title = "Война и мир", Author = "Толстой Л.Н.", Total = 5, OnHands = 2 });
        cat.Add(new Book { Title = "1984",        Author = "Оруэлл Дж.",   Total = 3, OnHands = 3 });

        cat.Print();
        Console.WriteLine("\nВыдаём «Война и мир»: " + cat.GiveOut("Война и мир"));
        Console.WriteLine("\nДоступные книги:");
        foreach (var b in cat.Available()) Console.WriteLine(b);
    }
}`,
      },
    ],
  },
]
