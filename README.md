# DreamSync AI

DreamSync AI is a smart productivity and goal-planning web application designed for students and working professionals who want to balance their daily responsibilities while working toward long-term goals such as placements, competitive exams, skill development, or personal growth.

Unlike traditional to-do list applications, DreamSync AI focuses on goal-oriented planning by generating realistic schedules based on a user's lifestyle, availability, and priorities.

---

## Features

- Smart Goal Management
- Intelligent Daily Planner
- Task Management
- Habit Tracker
- Progress Analytics Dashboard
- Calendar View
- Daily Schedule Generator
- Goal Progress Tracking
- JWT Authentication
- Responsive UI
- Dark Mode Support
- REST API Integration

---

## Problem Statement

Many students and professionals struggle to balance their work, studies, and personal goals. Existing planners only allow users to create tasks manually and rarely help them plan realistically.

DreamSync AI provides a structured planning system that helps users:

- Set meaningful long-term goals
- Organize daily tasks
- Track habits consistently
- Monitor progress through analytics
- Maintain work-life-study balance

---

## Tech Stack

### Backend

- Django
- Django REST Framework
- PostgreSQL / SQLite
- JWT Authentication

### Frontend

- HTML5
- CSS3
- Bootstrap 5
- JavaScript

### Visualization

- Chart.js

### Tools

- Git
- GitHub

---

## Project Structure

```
DreamSync/
│
├── authentication/
├── planner/
├── dashboard/
├── goals/
├── habits/
├── analytics/
├── templates/
├── static/
├── media/
├── config/
├── requirements.txt
└── README.md
```

---

## Core Modules

### Authentication

- User Registration
- Login
- JWT Authentication
- Profile Management

### Goal Management

- Create Goals
- Set Priorities
- Target Completion Date
- Daily Study Hours

### Smart Planner

- Daily Schedule Generation
- Work/College Time Management
- Study Planning
- Revision Planning

### Task Management

- Create Tasks
- Update Tasks
- Delete Tasks
- Task Completion Tracking

### Habit Tracker

- Reading
- Coding
- Exercise
- Water Intake
- Meditation
- Sleep Tracking

### Analytics

- Daily Progress
- Weekly Progress
- Study Hours
- Goal Completion
- Habit Streaks
- Productivity Insights

---

## Screens

- Landing Page
- Login
- Register
- Dashboard
- Goals
- Planner
- Habits
- Progress Analytics
- User Profile

---

## Installation

### Clone the Repository

```bash
git clone https://github.com/your-username/DreamSync.git
cd DreamSync
```

### Create Virtual Environment

```bash
python -m venv venv
```

### Activate Environment

Windows

```bash
venv\Scripts\activate
```

Linux / macOS

```bash
source venv/bin/activate
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Run Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### Create Superuser

```bash
python manage.py createsuperuser
```

### Start Development Server

```bash
python manage.py runserver
```

Open your browser and visit:

```
http://127.0.0.1:8000/
```

---

## API

The backend is built using Django REST Framework and provides RESTful APIs for:

- Authentication
- Goals
- Tasks
- Planner
- Habits
- Analytics
- User Profile

---

## Future Enhancements

- AI-powered schedule optimization
- Google Calendar integration
- Email reminders
- Push notifications
- Pomodoro timer
- Study recommendations
- Resource management
- Team collaboration
- Mobile application
- AI productivity assistant

---

## Learning Outcomes

This project demonstrates practical implementation of:

- Django
- Django REST Framework
- REST API Development
- Authentication & Authorization
- PostgreSQL
- Responsive Web Design
- Dashboard Development
- CRUD Operations
- Data Visualization
- Full Stack Web Development

---

## License

This project is developed for educational and portfolio purposes.

---

## Author

**Dharshana B**

Bachelor of Information Technology

Passionate about Full Stack Development, Artificial Intelligence, Machine Learning, and Building Real-World Applications.
