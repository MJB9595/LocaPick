package picstory.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/todos")
public class TodoController {
    @GetMapping
    public ResponseEntity<List<String>> getAllTodos(){
        return ResponseEntity.ok(Collections.emptyList());
    }
}
