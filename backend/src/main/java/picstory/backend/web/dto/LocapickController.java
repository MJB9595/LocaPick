package picstory.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import picstory.backend.service.LocapickService;
import picstory.backend.web.dto.LocapickResponseDto;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/locapick")
public class LocapickController {

    private final LocapickService locapickService;

    @GetMapping("/search")
    public ResponseEntity<List<LocapickResponseDto>> searchLocapick(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam int time,
            @RequestParam int count,
            @RequestParam String category
    ) {
        List<LocapickResponseDto> results = locapickService.getRecommendations(lat, lng, time, count, category);
        return ResponseEntity.ok(results);
    }
}