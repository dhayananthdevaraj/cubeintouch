package com.examly.springapp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.File;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class SpringappApplicationTests {

    private String usertoken;
    private String admintoken;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private ObjectMapper objectMapper; // To parse JSON responses

    private HttpHeaders createHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }


    @Test
    @Order(1)
    void backend_testRegisterAdmin() {
        String requestBody = "{\"userId\": 1,\"email\": \"demoadmin@gmail.com\", \"password\": \"admin@1234\", \"username\": \"admin123\", \"userRole\": \"Admin\", \"mobileNumber\": \"9876543210\"}";
        ResponseEntity<String> response = restTemplate.postForEntity("/api/register",
                new HttpEntity<>(requestBody, createHeaders()), String.class);

        Assertions.assertEquals(HttpStatus.CREATED, response.getStatusCode());
    }

    @Test
    @Order(2)
    void backend_testRegisterUser() {
        String requestBody = "{\"userId\": 2,\"email\": \"demouser@gmail.com\", \"password\": \"user@1234\", \"username\": \"user123\", \"userRole\": \"User\", \"mobileNumber\": \"1122334455\"}";
        ResponseEntity<String> response = restTemplate.postForEntity("/api/register",
                new HttpEntity<>(requestBody, createHeaders()), String.class);

        Assertions.assertEquals(HttpStatus.CREATED, response.getStatusCode());
    }

    @Test
    @Order(3)
    void backend_testLoginAdmin() throws Exception {
        String requestBody = "{\"email\": \"demoadmin@gmail.com\", \"password\": \"admin@1234\"}";

        ResponseEntity<String> response = restTemplate.postForEntity("/api/login",
                new HttpEntity<>(requestBody, createHeaders()), String.class);

        // Check if response body is null
        Assertions.assertNotNull(response.getBody(), "Response body is null!");

        JsonNode responseBody = objectMapper.readTree(response.getBody());
        String token = responseBody.get("token").asText();
        admintoken = token;

        Assertions.assertEquals(HttpStatus.OK, response.getStatusCode());
        Assertions.assertNotNull(token);
    }

    @Test
    @Order(4)
    void backend_testLoginUser() throws Exception {
        String requestBody = "{\"email\": \"demouser@gmail.com\", \"password\": \"user@1234\"}";

        ResponseEntity<String> response = restTemplate.postForEntity("/api/login",
                new HttpEntity<>(requestBody, createHeaders()), String.class);

        JsonNode responseBody = objectMapper.readTree(response.getBody());
        String token = responseBody.get("token").asText();
        usertoken = token;

        Assertions.assertEquals(HttpStatus.OK, response.getStatusCode());
        Assertions.assertNotNull(token);
    }

    
 
@Test
@Order(5)
void backend_testAddWiFiSchemeWithRoleValidation() throws Exception {
    // Ensure tokens are available
    Assertions.assertNotNull(admintoken, "Admin token should not be null");
    Assertions.assertNotNull(usertoken, "User token should not be null");

    // Construct the Request Body for WiFiScheme WITHOUT WRAPPER
    String requestBody = "{"
            + "\"schemeName\": \"SuperFast 500\","
            + "\"description\": \"500 Mbps Unlimited Plan\","
            + "\"region\": \"Tamil Nadu\","
            + "\"speed\": \"500 Mbps\","
            + "\"dataLimit\": \"Unlimited\","
            + "\"fee\": 999.00,"
            + "\"availabilityStatus\": \"Available\""
            + "}";

    // Test with Admin Token (Expecting 201 Created)
    HttpHeaders adminHeaders = createHeaders();
    adminHeaders.set("Authorization", "Bearer " + admintoken);
    HttpEntity<String> adminRequest = new HttpEntity<>(requestBody, adminHeaders);

    ResponseEntity<String> adminResponse = restTemplate.exchange("/api/wifiScheme", HttpMethod.POST, adminRequest, String.class);

    // Verify Response Status for Admin
    System.out.println(adminResponse.getStatusCode() + " Status code for Admin adding WiFiScheme");
    Assertions.assertEquals(HttpStatus.CREATED, adminResponse.getStatusCode());

    JsonNode responseBody = objectMapper.readTree(adminResponse.getBody());

    // Validate fields
    Assertions.assertEquals("SuperFast 500", responseBody.get("schemeName").asText());
    Assertions.assertEquals("500 Mbps", responseBody.get("speed").asText());
    Assertions.assertEquals("Unlimited", responseBody.get("dataLimit").asText());
    Assertions.assertEquals("Tamil Nadu", responseBody.get("region").asText());
    Assertions.assertEquals("Available", responseBody.get("availabilityStatus").asText());
    Assertions.assertEquals(999.00, responseBody.get("fee").asDouble());

    //Test with User Token (Expecting 403 Forbidden)
    HttpHeaders userHeaders = createHeaders();
    userHeaders.set("Authorization", "Bearer " + usertoken);
    HttpEntity<String> userRequest = new HttpEntity<>(requestBody, userHeaders);

    ResponseEntity<String> userResponse = restTemplate.exchange("/api/wifiScheme", HttpMethod.POST, userRequest, String.class);

    System.out.println(userResponse.getStatusCode() + " Status code for User trying to add WiFiScheme");
    Assertions.assertEquals(HttpStatus.FORBIDDEN, userResponse.getStatusCode());
}


@Test
@Order(6)
void backend_testGetWiFiSchemeByIdWithRoleValidation() throws Exception {
    // Ensure tokens are available
    Assertions.assertNotNull(admintoken, "Admin token should not be null");
    Assertions.assertNotNull(usertoken, "User token should not be null");

    // Assume a WiFiScheme with ID 1 already exists in the database.
    Long wifiSchemeId = 1L;

    // Admin access: should succeed
    HttpHeaders adminHeaders = createHeaders();
    adminHeaders.set("Authorization", "Bearer " + admintoken);
    HttpEntity<Void> adminRequest = new HttpEntity<>(adminHeaders);

    ResponseEntity<String> adminResponse = restTemplate.exchange(
            "/api/wifiScheme/" + wifiSchemeId,
            HttpMethod.GET,
            adminRequest,
            String.class);

    System.out.println(adminResponse.getStatusCode() + " Status code for Admin fetching WiFiScheme by ID");
    Assertions.assertEquals(HttpStatus.OK, adminResponse.getStatusCode());

    JsonNode responseBody = objectMapper.readTree(adminResponse.getBody());

    // Basic field validation
    Assertions.assertEquals(wifiSchemeId.longValue(), responseBody.get("wifiSchemeId").asLong());
    Assertions.assertNotNull(responseBody.get("schemeName").asText());
    Assertions.assertNotNull(responseBody.get("availabilityStatus").asText());

    // User access: should be forbidden
    HttpHeaders userHeaders = createHeaders();
    userHeaders.set("Authorization", "Bearer " + usertoken);
    HttpEntity<Void> userRequest = new HttpEntity<>(userHeaders);

    ResponseEntity<String> userResponse = restTemplate.exchange(
            "/api/wifiScheme/" + wifiSchemeId,
            HttpMethod.GET,
            userRequest,
            String.class);

    System.out.println(userResponse.getStatusCode() + " Status code for User trying to access WiFiScheme by ID");
    Assertions.assertEquals(HttpStatus.FORBIDDEN, userResponse.getStatusCode());
}

@Test
@Order(7)
void backend_testGetAllWiFiSchemesWithRoleValidation() throws Exception {
    // Ensure tokens are available
    Assertions.assertNotNull(admintoken, "Admin token should not be null");
    Assertions.assertNotNull(usertoken, "User token should not be null");

    // --- Admin Role Access ---
    HttpHeaders adminHeaders = createHeaders();
    adminHeaders.set("Authorization", "Bearer " + admintoken);
    HttpEntity<Void> adminRequest = new HttpEntity<>(adminHeaders);

    ResponseEntity<String> adminResponse = restTemplate.exchange(
            "/api/wifiScheme",
            HttpMethod.GET,
            adminRequest,
            String.class
    );

    System.out.println("Admin Status Code: " + adminResponse.getStatusCode());
    Assertions.assertEquals(HttpStatus.OK, adminResponse.getStatusCode());

    JsonNode adminJson = objectMapper.readTree(adminResponse.getBody());
    Assertions.assertTrue(adminJson.isArray(), "Admin response should be an array");

    // --- User Role Access ---
    HttpHeaders userHeaders = createHeaders();
    userHeaders.set("Authorization", "Bearer " + usertoken);
    HttpEntity<Void> userRequest = new HttpEntity<>(userHeaders);

    ResponseEntity<String> userResponse = restTemplate.exchange(
            "/api/wifiScheme",
            HttpMethod.GET,
            userRequest,
            String.class
    );

    System.out.println("User Status Code: " + userResponse.getStatusCode());
    Assertions.assertEquals(HttpStatus.OK, userResponse.getStatusCode());

    JsonNode userJson = objectMapper.readTree(userResponse.getBody());
    Assertions.assertTrue(userJson.isArray(), "User response should be an array");
}
@Test
@Order(8)
void backend_testUpdateWiFiScheme() throws Exception {
    Assertions.assertNotNull(admintoken, "Admin token should not be null");
    Assertions.assertNotNull(usertoken, "User token should not be null");

    Long wifiSchemeId = 1L; // Ensure this ID exists in the DB

    String requestBody = "{"
            + "\"schemeName\": \"Updated Scheme Name\","
            + "\"availabilityStatus\": \"Active\""
            + "}";

    HttpHeaders headers = createHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);

    // ❌ User tries to update — should be forbidden
    headers.set("Authorization", "Bearer " + usertoken);
    HttpEntity<String> userRequest = new HttpEntity<>(requestBody, headers);
    ResponseEntity<String> userResponse = restTemplate.exchange(
            "/api/wifiScheme/" + wifiSchemeId,
            HttpMethod.PUT,
            userRequest,
            String.class
    );
    Assertions.assertEquals(HttpStatus.FORBIDDEN, userResponse.getStatusCode());

    // ✅ Admin updates successfully — should be OK
    headers.set("Authorization", "Bearer " + admintoken);
    HttpEntity<String> adminRequest = new HttpEntity<>(requestBody, headers);
    ResponseEntity<String> adminResponse = restTemplate.exchange(
            "/api/wifiScheme/" + wifiSchemeId,
            HttpMethod.PUT,
            adminRequest,
            String.class
    );
    Assertions.assertEquals(HttpStatus.OK, adminResponse.getStatusCode());
}


@Test
@Order(9)
void backend_testWiFiRequestWithRoleValidation() throws Exception {
    Assertions.assertNotNull(usertoken, "User token should not be null");
    Assertions.assertNotNull(admintoken, "Admin token should not be null");

    String requestBody = "{"
            + "\"user\": {\"userId\": 2},"
            + "\"wifiScheme\": {\"wifiSchemeId\": 1},"
            + "\"requestDate\": \"2025-05-08\","
            + "\"status\": \"Pending\","
            + "\"comments\": \"Please approve soon.\","
            + "\"proof\": \"U2FtcGxlUHJvb2ZEb2N1bWVudA==\","
            + "\"streetName\": \"MG Road\","
            + "\"landmark\": \"Near Central Park\","
            + "\"city\": \"Coimbatore\","
            + "\"state\": \"Tamil Nadu\","
            + "\"zipCode\": \"641001\","
            + "\"preferredSetupDate\": \"2025-05-15\","
            + "\"timeSlot\": \"09:00 AM - 11:00 AM\""
            + "}";

    // ✅ Test with User Token (Expecting 201 Created)
    HttpHeaders userHeaders = createHeaders();
    userHeaders.set("Authorization", "Bearer " + usertoken);
    HttpEntity<String> userRequest = new HttpEntity<>(requestBody, userHeaders);

    ResponseEntity<String> userResponse = restTemplate.exchange(
            "/api/wifiSchemeRequest",
            HttpMethod.POST,
            userRequest,
            String.class);

    Assertions.assertEquals(HttpStatus.CREATED, userResponse.getStatusCode());

    JsonNode userResponseBody = objectMapper.readTree(userResponse.getBody());
    Assertions.assertEquals("Pending", userResponseBody.get("status").asText());
    Assertions.assertEquals("Coimbatore", userResponseBody.get("city").asText());

    // ❌ Test with Admin Token (Expecting 403 Forbidden)
    HttpHeaders adminHeaders = createHeaders();
    adminHeaders.set("Authorization", "Bearer " + admintoken);
    HttpEntity<String> adminRequest = new HttpEntity<>(requestBody, adminHeaders);

    ResponseEntity<String> adminResponse = restTemplate.exchange(
            "/api/wifiSchemeRequest",
            HttpMethod.POST,
            adminRequest,
            String.class);

    Assertions.assertEquals(HttpStatus.FORBIDDEN, adminResponse.getStatusCode());
}


@Test
@Order(10)
void backend_testGetWiFiRequestByIdWithBothRoles() throws Exception {
    Assertions.assertNotNull(admintoken, "Admin token should not be null");
    Assertions.assertNotNull(usertoken, "User token should not be null");

    Long wifiRequestId = 1L; // Ensure this ID exists in the database

    // ----- Admin Role Access -----
    HttpHeaders adminHeaders = createHeaders();
    adminHeaders.set("Authorization", "Bearer " + admintoken);
    HttpEntity<Void> adminRequest = new HttpEntity<>(adminHeaders);

    ResponseEntity<String> adminResponse = restTemplate.exchange(
            "/api/wifiSchemeRequest/" + wifiRequestId,
            HttpMethod.GET,
            adminRequest,
            String.class
    );

    System.out.println("Admin GET Status: " + adminResponse.getStatusCode());
    Assertions.assertEquals(HttpStatus.OK, adminResponse.getStatusCode());

    JsonNode adminResponseBody = objectMapper.readTree(adminResponse.getBody());
    Assertions.assertEquals(wifiRequestId.longValue(), adminResponseBody.get("wifiSchemeRequestId").asLong());

    // ----- User Role Access -----
    HttpHeaders userHeaders = createHeaders();
    userHeaders.set("Authorization", "Bearer " + usertoken);
    HttpEntity<Void> userRequest = new HttpEntity<>(userHeaders);

    ResponseEntity<String> userResponse = restTemplate.exchange(
            "/api/wifiSchemeRequest/" + wifiRequestId,
            HttpMethod.GET,
            userRequest,
            String.class
    );

    System.out.println("User GET Status: " + userResponse.getStatusCode());
    Assertions.assertEquals(HttpStatus.OK, userResponse.getStatusCode());

    JsonNode userResponseBody = objectMapper.readTree(userResponse.getBody());
    Assertions.assertEquals(wifiRequestId.longValue(), userResponseBody.get("wifiSchemeRequestId").asLong());
}


@Test
@Order(11)
void backend_testGetWiFiRequestsByUserId_UserOnlyAccess() throws Exception {
    Assertions.assertNotNull(usertoken, "User token should not be null");
    Assertions.assertNotNull(admintoken, "Admin token should not be null");

    Long userId = 2L; // Make sure this is the ID of the User (not Admin)

    // ----- USER access (should be allowed) -----
    HttpHeaders userHeaders = createHeaders();
    userHeaders.set("Authorization", "Bearer " + usertoken);
    HttpEntity<Void> userRequest = new HttpEntity<>(userHeaders);

    ResponseEntity<String> userResponse = restTemplate.exchange(
            "/api/wifiSchemeRequest/user/" + userId,
            HttpMethod.GET,
            userRequest,
            String.class
    );

    System.out.println("User GET by UserId Status: " + userResponse.getStatusCode());
    Assertions.assertEquals(HttpStatus.OK, userResponse.getStatusCode());

    JsonNode responseJson = objectMapper.readTree(userResponse.getBody());
    Assertions.assertTrue(responseJson.isArray());

    // ----- ADMIN access (should be denied) -----
    HttpHeaders adminHeaders = createHeaders();
    adminHeaders.set("Authorization", "Bearer " + admintoken);
    HttpEntity<Void> adminRequest = new HttpEntity<>(adminHeaders);

    ResponseEntity<String> adminResponse = restTemplate.exchange(
            "/api/wifiSchemeRequest/user/" + userId,
            HttpMethod.GET,
            adminRequest,
            String.class
    );

    System.out.println("Admin GET by UserId Status: " + adminResponse.getStatusCode());
    Assertions.assertEquals(HttpStatus.FORBIDDEN, adminResponse.getStatusCode());
}


@Test
@Order(12)
void backend_testGetAllWiFiRequests_AdminOnlyAccess() throws Exception {
    Assertions.assertNotNull(admintoken, "Admin token should not be null");
    Assertions.assertNotNull(usertoken, "User token should not be null");

    // ----- ADMIN access (should be allowed) -----
    HttpHeaders adminHeaders = createHeaders();
    adminHeaders.set("Authorization", "Bearer " + admintoken);
    HttpEntity<Void> adminRequest = new HttpEntity<>(adminHeaders);

    ResponseEntity<String> adminResponse = restTemplate.exchange(
            "/api/wifiSchemeRequest",
            HttpMethod.GET,
            adminRequest,
            String.class
    );

    System.out.println("Admin GET all requests Status: " + adminResponse.getStatusCode());
    Assertions.assertEquals(HttpStatus.OK, adminResponse.getStatusCode());

    JsonNode responseJson = objectMapper.readTree(adminResponse.getBody());
    Assertions.assertTrue(responseJson.isArray());

    // ----- USER access (should be denied) -----
    HttpHeaders userHeaders = createHeaders();
    userHeaders.set("Authorization", "Bearer " + usertoken);
    HttpEntity<Void> userRequest = new HttpEntity<>(userHeaders);

    ResponseEntity<String> userResponse = restTemplate.exchange(
            "/api/wifiSchemeRequest",
            HttpMethod.GET,
            userRequest,
            String.class
    );

    System.out.println("User GET all requests Status: " + userResponse.getStatusCode());
    Assertions.assertEquals(HttpStatus.FORBIDDEN, userResponse.getStatusCode());
}


@Test
@Order(13)
void backend_testAddFeedback() throws Exception {
    Assertions.assertNotNull(usertoken, "User token should not be null");
    Assertions.assertNotNull(admintoken, "Admin token should not be null");

   
    String requestBody = "{"
    + "\"feedbackText\": \"Great service!\","
    + "\"date\": \"2025-05-08\","
    + "\"user\": {\"userId\": 2},"
    + "\"wifiScheme\": {\"wifiSchemeId\": 1},"
    + "\"category\": \"Service\""
    + "}";
    //  User should be able to add feedback
    HttpHeaders userHeaders = createHeaders();
    userHeaders.set("Authorization", "Bearer " + usertoken);
    HttpEntity<String> userRequest = new HttpEntity<>(requestBody, userHeaders);
    ResponseEntity<String> userResponse = restTemplate.exchange("/api/feedback", HttpMethod.POST, userRequest, String.class);
    Assertions.assertEquals(HttpStatus.CREATED, userResponse.getStatusCode());

    //  Admin should NOT be able to add feedback
    HttpHeaders adminHeaders = createHeaders();
    adminHeaders.set("Authorization", "Bearer " + admintoken);
    HttpEntity<String> adminRequest = new HttpEntity<>(requestBody, adminHeaders);
    ResponseEntity<String> adminResponse = restTemplate.exchange("/api/feedback", HttpMethod.POST, adminRequest, String.class);
    Assertions.assertEquals(HttpStatus.FORBIDDEN, adminResponse.getStatusCode());
}

@Test
@Order(14)
void backend_testGetAllFeedback() throws Exception {
    Assertions.assertNotNull(usertoken, "User token should not be null");
    Assertions.assertNotNull(admintoken, "Admin token should not be null");

    //  Admin should be able to get all feedback
    HttpHeaders adminHeaders = createHeaders();
    adminHeaders.set("Authorization", "Bearer " + admintoken);
    HttpEntity<Void> adminRequest = new HttpEntity<>(adminHeaders);
    ResponseEntity<String> adminResponse = restTemplate.exchange("/api/feedback", HttpMethod.GET, adminRequest, String.class);
    Assertions.assertEquals(HttpStatus.OK, adminResponse.getStatusCode());

    //  User should NOT be able to get all feedback
    HttpHeaders userHeaders = createHeaders();
    userHeaders.set("Authorization", "Bearer " + usertoken);
    HttpEntity<Void> userRequest = new HttpEntity<>(userHeaders);
    ResponseEntity<String> userResponse = restTemplate.exchange("/api/feedback", HttpMethod.GET, userRequest, String.class);
    Assertions.assertEquals(HttpStatus.FORBIDDEN, userResponse.getStatusCode());
}

@Test
@Order(15)
void backend_testGetFeedbackByUserId() throws Exception {
    Assertions.assertNotNull(usertoken, "User token should not be null");
    Assertions.assertNotNull(admintoken, "Admin token should not be null");

    //  User should be able to get their own feedback
    HttpHeaders userHeaders = createHeaders();
    userHeaders.set("Authorization", "Bearer " + usertoken);
    HttpEntity<Void> userRequest = new HttpEntity<>(userHeaders);
    ResponseEntity<String> userResponse = restTemplate.exchange("/api/feedback/user/2", HttpMethod.GET, userRequest, String.class);
    Assertions.assertEquals(HttpStatus.OK, userResponse.getStatusCode(), "User should be able to get their own feedback");

    //  Admin should NOT be able to get user feedback
    HttpHeaders adminHeaders = createHeaders();
    adminHeaders.set("Authorization", "Bearer " + admintoken);
    HttpEntity<Void> adminRequest = new HttpEntity<>(adminHeaders);
    ResponseEntity<String> adminResponse = restTemplate.exchange("/api/feedback/user/2", HttpMethod.GET, adminRequest, String.class);
    Assertions.assertEquals(HttpStatus.FORBIDDEN, adminResponse.getStatusCode(), "Admin should NOT be able to get user feedback");
} 


}