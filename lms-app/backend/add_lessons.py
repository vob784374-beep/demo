import pymysql
from datetime import datetime

conn = pymysql.connect(
    host="db", user="lms_user", password="lms_password", database="lms_db"
)
cursor = conn.cursor()
now = datetime.now()
lessons = [
    (1, "Phonetic Alphabet", "Learn IPA symbols", 2, now, now),
    (1, "Vowel Sounds", "Master 12 vowel sounds", 3, now, now),
    (1, "Consonant Sounds", "Practice 24 consonants", 4, now, now),
    (1, "Stress Patterns", "Understand stress rules", 5, now, now),
    (2, "Essential Verbs", "100 common verbs", 2, now, now),
    (2, "Daily Conversations", "Common phrases", 3, now, now),
    (2, "Building Sentences", "Construct sentences", 4, now, now),
    (3, "Present Tense", "Present tenses", 2, now, now),
    (3, "Past Tense", "Past tenses", 3, now, now),
    (3, "Future Tense", "Future expressions", 4, now, now),
]
for c_id, title, content, order, ca, ua in lessons:
    cursor.execute(
        "INSERT INTO lessons (course_id, title, content, `order`, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s)",
        (c_id, title, content, order, ca, ua),
    )
conn.commit()
print(f"Added {len(lessons)} lessons")
conn.close()
