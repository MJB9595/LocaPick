package picstory.backend.domain;

public enum PostCategory {

    DAILY("일상"),
    HOBBY("취미"),
    TRAVEL("여행"),
    WORK("업무"),
    STUDY("공부"),
    ETC("기타");
    private final String label;

    PostCategory(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
