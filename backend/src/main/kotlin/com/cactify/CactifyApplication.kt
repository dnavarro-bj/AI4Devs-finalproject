package com.cactify

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class CactifyApplication

fun main(args: Array<String>) {
  runApplication<CactifyApplication>(*args)
}
