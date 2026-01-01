import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Clear existing data — use TRUNCATE to ensure tables are fully cleared and sequences reset
    console.log('🧹 Truncating tables and resetting sequences...');
    await prisma.$executeRaw`TRUNCATE TABLE "questions","learning_progress","enrollments","lessons","chapters","courses","tokens","users","roles" RESTART IDENTITY CASCADE;`;
    console.log('✅ Tables truncated and sequences reset');

    // Create roles
    let studentRole = await prisma.roles.findFirst({
        where: { name: 'STUDENT' },
    });
    if (!studentRole) {
        studentRole = await prisma.roles.create({
            data: { name: 'STUDENT' },
        });
    }

    let lecturerRole = await prisma.roles.findFirst({
        where: { name: 'LECTURER' },
    });
    if (!lecturerRole) {
        lecturerRole = await prisma.roles.create({
            data: { name: 'LECTURER' },
        });
    }

    let adminRole = await prisma.roles.findFirst({
        where: { name: 'ADMIN' },
    });
    if (!adminRole) {
        adminRole = await prisma.roles.create({
            data: { name: 'ADMIN' },
        });
    }

    console.log('✅ Roles created');

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create users
    let john = await prisma.users.findFirst({
        where: { email: 'john@gmail.com' },
    });
    if (!john) {
        john = await prisma.users.create({
            data: {
                email: 'john@gmail.com',
                password_hash: hashedPassword,
                full_name: 'John Doe',
                age: 15,
                role_id: studentRole.id,
                status: 'ACTIVE',
                created_at: new Date(),
            },
        });
    }

    let jack = await prisma.users.findFirst({
        where: { email: 'jack@gmail.com' },
    });
    if (!jack) {
        jack = await prisma.users.create({
            data: {
                email: 'jack@gmail.com',
                password_hash: hashedPassword,
                full_name: 'Jack Smith',
                age: 38,
                role_id: lecturerRole.id,
                status: 'ACTIVE',
                created_at: new Date(),
            },
        });
    }

    let admin = await prisma.users.findFirst({
        where: { email: 'admin1@gmail.com' },
    });
    if (!admin) {
        admin = await prisma.users.create({
            data: {
                email: 'admin1@gmail.com',
                password_hash: hashedPassword,
                full_name: 'TrongTin Admin',
                age: 31,
                role_id: adminRole.id,
                status: 'ACTIVE',
                created_at: new Date(),
            },
        });
    }

    console.log('✅ Users created');

    // Create courses
    const javaCourse = await prisma.courses.create({
        data: {
            lecturer_id: jack.id,
            title: 'Nhập môn Java',
            slug: 'nhap-mon-java',
            description: 'Khóa học Java cơ bản dành cho người mới bắt đầu',
            status: 'ACTIVE',
            submitted_at: new Date('2025-12-20'),
        },
    });

    const cppCourse = await prisma.courses.create({
        data: {
            lecturer_id: jack.id,
            title: 'Nhập môn C++',
            slug: 'nhap-mon-cpp',
            description: 'Khóa học C++ cơ bản dành cho người mới bắt đầu',
            status: 'PENDING',
            submitted_at: new Date('2025-12-25'),
        },
    });

    const pythonCourse = await prisma.courses.create({
        data: {
            lecturer_id: jack.id,
            title: 'Nhập môn Python',
            slug: 'nhap-mon-python',
            description: 'Khóa học Python cơ bản dành cho người mới bắt đầu',
            status: 'REJECTED',
            reject_note: 'Thêm quiz chất lượng',
            submitted_at: new Date('2025-12-15'),
        },
    });

    console.log('✅ Courses created');

    // Create chapters and lessons for Java course
    const javaChapter = await prisma.chapters.create({
        data: {
            course_id: javaCourse.id,
            title: 'Làm quen với Java',
            order_index: 1,
        },
    });

    await prisma.lessons.create({
        data: {
            chapter_id: javaChapter.id,
            title: 'Giới thiệu về Java',
            type: 'VIDEO',
            content_url: 'https://youtu.be/9tQ-GGE010s?si=IRbSd51Vl6NL32Ge',
            order_index: 1,
        },
    });

    const javaQuizLesson = await prisma.lessons.create({
        data: {
            chapter_id: javaChapter.id,
            title: 'Bài tập Java cơ bản',
            type: 'QUIZ',
            order_index: 2,
        },
    });

    // Create Java quiz questions
    const javaQuestions = [
        {
            content: 'Java là ngôn ngữ lập trình gì?',
            answer_key: 'A',
            option_a: 'Hướng đối tượng',
            option_b: 'Hướng thủ tục',
            option_c: 'Hướng hàm',
            option_d: 'Hướng logic',
        },
        {
            content: 'Cú pháp khai báo biến trong Java?',
            answer_key: 'B',
            option_a: 'var name;',
            option_b: 'String name;',
            option_c: 'name: String;',
            option_d: 'String: name;',
        },
        {
            content: 'Method main trong Java có dạng nào?',
            answer_key: 'A',
            option_a: 'public static void main(String[] args)',
            option_b: 'public void main(String args)',
            option_c: 'static void main()',
            option_d: 'void main(String[] args)',
        },
        {
            content: 'Để in ra màn hình trong Java?',
            answer_key: 'C',
            option_a: 'print("Hello");',
            option_b: 'echo "Hello";',
            option_c: 'System.out.println("Hello");',
            option_d: 'console.log("Hello");',
        },
        {
            content: 'Class trong Java bắt đầu bằng?',
            answer_key: 'B',
            option_a: 'class MyClass',
            option_b: 'public class MyClass',
            option_c: 'Class MyClass',
            option_d: 'def class MyClass',
        },
        {
            content: 'Kiểu dữ liệu nguyên thủy trong Java?',
            answer_key: 'A',
            option_a: 'int, double, boolean',
            option_b: 'Integer, Double, Boolean',
            option_c: 'string, number, bool',
            option_d: 'str, int, float',
        },
        {
            content: 'Comment một dòng trong Java?',
            answer_key: 'C',
            option_a: '# comment',
            option_b: '/* comment */',
            option_c: '// comment',
            option_d: '-- comment',
        },
        {
            content: 'Array trong Java khai báo như thế nào?',
            answer_key: 'B',
            option_a: 'int[] arr = new int[5];',
            option_b: 'int[] arr = new int[5];',
            option_c: 'int arr[] = new int[5];',
            option_d: 'Cả A và C đều đúng',
        },
        {
            content: 'Exception handling trong Java dùng?',
            answer_key: 'A',
            option_a: 'try-catch',
            option_b: 'try-except',
            option_c: 'catch-throw',
            option_d: 'handle-catch',
        },
        {
            content: 'Package trong Java dùng để?',
            answer_key: 'D',
            option_a: 'Đóng gói code',
            option_b: 'Tổ chức code',
            option_c: 'Import thư viện',
            option_d: 'Cả A, B, C đều đúng',
        },
    ];

    for (const q of javaQuestions) {
        await prisma.questions.create({
            data: {
                lesson_id: javaQuizLesson.id,
                content: q.content,
                answer_key: q.answer_key,
                option_a: q.option_a,
                option_b: q.option_b,
                option_c: q.option_c,
                option_d: q.option_d,
            },
        });
    }

    // Create chapters and lessons for C++ course
    const cppChapter = await prisma.chapters.create({
        data: {
            course_id: cppCourse.id,
            title: 'Làm quen với C++',
            order_index: 1,
        },
    });

    await prisma.lessons.create({
        data: {
            chapter_id: cppChapter.id,
            title: 'Giới thiệu về C++',
            type: 'VIDEO',
            content_url: 'https://youtu.be/5vLkWRF-dpE?si=Rso9nHCiT76jh4kJ',
            order_index: 1,
        },
    });

    const cppQuizLesson = await prisma.lessons.create({
        data: {
            chapter_id: cppChapter.id,
            title: 'Bài tập C++ cơ bản',
            type: 'QUIZ',
            order_index: 2,
        },
    });

    // Create C++ quiz questions
    const cppQuestions = [
        {
            content: 'C++ là ngôn ngữ lập trình gì?',
            answer_key: 'A',
            option_a: 'Hướng đối tượng',
            option_b: 'Hướng thủ tục',
            option_c: 'Hướng hàm',
            option_d: 'Hướng logic',
        },
        {
            content: 'Header file trong C++?',
            answer_key: 'B',
            option_a: '#include <iostream.h>',
            option_b: '#include <iostream>',
            option_c: 'import iostream',
            option_d: 'using iostream',
        },
        {
            content: 'Namespace std dùng để?',
            answer_key: 'C',
            option_a: 'Định nghĩa hàm',
            option_b: 'Khai báo biến',
            option_c: 'Sử dụng thư viện chuẩn',
            option_d: 'Tạo class',
        },
        {
            content: 'Để in ra màn hình trong C++?',
            answer_key: 'A',
            option_a: 'cout << "Hello";',
            option_b: 'print("Hello");',
            option_c: 'System.out.println("Hello");',
            option_d: 'console.log("Hello");',
        },
        {
            content: 'Class trong C++ khai báo như thế nào?',
            answer_key: 'B',
            option_a: 'class MyClass {}',
            option_b: 'class MyClass {};',
            option_c: 'Class MyClass {}',
            option_d: 'def class MyClass:',
        },
        {
            content: 'Con trỏ trong C++ dùng ký hiệu?',
            answer_key: 'A',
            option_a: '*',
            option_b: '&',
            option_c: '#',
            option_d: '@',
        },
        {
            content: 'Comment một dòng trong C++?',
            answer_key: 'C',
            option_a: '# comment',
            option_b: '/* comment */',
            option_c: '// comment',
            option_d: '-- comment',
        },
        {
            content: 'Vector trong C++ tương tự?',
            answer_key: 'B',
            option_a: 'Array tĩnh',
            option_b: 'Array động',
            option_c: 'Linked list',
            option_d: 'Stack',
        },
        {
            content: 'Memory management trong C++?',
            answer_key: 'A',
            option_a: 'new và delete',
            option_b: 'malloc và free',
            option_c: 'alloc và dealloc',
            option_d: 'create và destroy',
        },
        {
            content: 'Template trong C++ dùng để?',
            answer_key: 'D',
            option_a: 'Tạo class',
            option_b: 'Định nghĩa hàm',
            option_c: 'Generic programming',
            option_d: 'Cả A, B, C đều đúng',
        },
    ];

    for (const q of cppQuestions) {
        await prisma.questions.create({
            data: {
                lesson_id: cppQuizLesson.id,
                content: q.content,
                answer_key: q.answer_key,
                option_a: q.option_a,
                option_b: q.option_b,
                option_c: q.option_c,
                option_d: q.option_d,
            },
        });
    }

    // Create chapters and lessons for Python course
    const pythonChapter = await prisma.chapters.create({
        data: {
            course_id: pythonCourse.id,
            title: 'Làm quen với Python',
            order_index: 1,
        },
    });

    await prisma.lessons.create({
        data: {
            chapter_id: pythonChapter.id,
            title: 'Giới thiệu về Python',
            type: 'VIDEO',
            content_url: 'https://youtu.be/NZj6LI5a9vc?si=3s0sCa3Z68qu9qBq',
            order_index: 1,
        },
    });

    console.log('✅ Chapters, lessons and questions created');

    console.log('🎉 Database seeded successfully!');
    console.log('\n📊 Test Data Summary:');
    console.log('👤 Users:');
    console.log('   - John (Student): john@gmail.com / password123');
    console.log('   - Jack (Lecturer): jack@gmail.com / password123');
    console.log('   - TrongTin (Admin): admin1@gmail.com / password123');
    console.log('📚 Courses:');
    console.log('   - Java Course: ACTIVE');
    console.log('   - C++ Course: PENDING');
    console.log('   - Python Course: REJECTED');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
