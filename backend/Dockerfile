# Java 17 버전을 기반으로 이미지를 만듭니다.
FROM openjdk:21-jdk-slim

# JAR 파일이 생성될 경로를 변수로 지정합니다.
ARG JAR_FILE=build/libs/*.jar

# JAR 파일을 컨테이너 내부의 app.jar로 복사합니다.
COPY ${JAR_FILE} app.jar

# 컨테이너가 시작될 때 실행할 명령어를 지정합니다.
ENTRYPOINT ["java","-jar","/app.jar"]